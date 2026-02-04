/**
 * wolf-infra.js - Unified wolf + infrastructure spawning
 * 
 * Ties together:
 * - Free trial wolves (24h / 10 messages)
 * - $ROMULUS holder tiers (dedicated microVMs)
 * - Wolf personality/state management
 * 
 * Flow:
 * 1. Check wallet's $ROMULUS balance
 * 2. Assign tier based on holdings
 * 3. Free tier = serverless function wolves
 * 4. Paid tiers = spawn dedicated microVM agent
 */

const ROMULUS_MINT = '5ruEtrHGgqxE3Zo1UdRAvVrdetLwq6SFJvLjgth6pump';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Infrastructure endpoint (update when deployed)
const INFRA_GATEWAY = process.env.ROMULUS_INFRA_URL || 'https://api.romulus.ai';

// Tier thresholds (in tokens, assuming 6 decimals displayed as whole numbers)
const TIERS = {
  trial:    { min: 0,         max: 99999,    cores: 0, memory: 0,    type: 'serverless', name: 'Trial' },
  basic:    { min: 100000,    max: 499999,   cores: 1, memory: 1024, type: 'microvm',    name: 'Basic' },
  standard: { min: 500000,    max: 999999,   cores: 2, memory: 2048, type: 'microvm',    name: 'Standard' },
  pro:      { min: 1000000,   max: 4999999,  cores: 4, memory: 4096, type: 'microvm',    name: 'Pro' },
  power:    { min: 5000000,   max: Infinity, cores: 8, memory: 8192, type: 'microvm',    name: 'Power' }
};

// Wolf types map to agent capabilities
const WOLF_CAPABILITIES = {
  assistant: ['reminders', 'tasks', 'chat'],
  scout:     ['search', 'monitor', 'alerts'],
  research:  ['analysis', 'summarize', 'deep-dive'],
  builder:   ['code', 'automate', 'execute']
};

/**
 * Get $ROMULUS balance for wallet
 */
async function getRomulusBalance(walletAddress) {
  try {
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: ROMULUS_MINT },
          { encoding: 'jsonParsed' }
        ]
      })
    });

    const data = await response.json();
    
    if (data.result?.value?.length > 0) {
      const tokenAccount = data.result.value[0];
      const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Balance check error:', error);
    return 0;
  }
}

/**
 * Determine tier from balance
 */
function getTierFromBalance(balance) {
  for (const [tierKey, tierConfig] of Object.entries(TIERS)) {
    if (balance >= tierConfig.min && balance <= tierConfig.max) {
      return { key: tierKey, ...tierConfig };
    }
  }
  return { key: 'trial', ...TIERS.trial };
}

/**
 * Spawn infrastructure VM (calls romulus-infra gateway)
 */
async function spawnInfraVM(wallet, tier, wolfConfig) {
  try {
    // For now, return placeholder - actual infra not deployed yet
    // When infra is live, this will call the gateway
    
    if (INFRA_GATEWAY === 'https://api.romulus.ai') {
      // Infra not deployed yet - return mock
      return {
        success: true,
        pending: true,
        message: 'Infrastructure launching soon. Your wolf will be upgraded automatically.',
        tier: tier.key,
        resources: {
          cores: tier.cores,
          memory: tier.memory
        }
      };
    }

    const response = await fetch(`${INFRA_GATEWAY}/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet': wallet
      },
      body: JSON.stringify({
        agent_type: wolfConfig.type || 'assistant',
        wolf_name: wolfConfig.name,
        capabilities: WOLF_CAPABILITIES[wolfConfig.type] || WOLF_CAPABILITIES.assistant
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        agentId: data.agent.id,
        agentUrl: data.agent.url,
        tier: tier.key,
        resources: {
          cores: tier.cores,
          memory: tier.memory
        }
      };
    } else {
      throw new Error(data.error || 'Spawn failed');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET /wolf-infra?wallet=xxx - Check tier
  if (event.httpMethod === 'GET') {
    const wallet = event.queryStringParameters?.wallet;
    
    if (!wallet) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tiers: Object.entries(TIERS).map(([key, config]) => ({
            key,
            name: config.name,
            minHoldings: config.min,
            type: config.type,
            cores: config.cores,
            memory: config.memory
          }))
        })
      };
    }

    try {
      const balance = await getRomulusBalance(wallet);
      const tier = getTierFromBalance(balance);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          wallet,
          balance,
          tier: tier.key,
          tierName: tier.name,
          tierType: tier.type,
          resources: tier.type === 'microvm' ? {
            cores: tier.cores,
            memory: tier.memory
          } : null,
          nextTier: getNextTier(tier.key),
          infraReady: INFRA_GATEWAY !== 'https://api.romulus.ai'
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // POST /wolf-infra - Spawn wolf with tier
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { wallet, wolfName, wolfType, action } = body;

      if (action === 'check-tier') {
        const balance = await getRomulusBalance(wallet);
        const tier = getTierFromBalance(balance);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            balance,
            tier: tier.key,
            tierName: tier.name,
            eligible: tier.type === 'microvm',
            resources: tier.type === 'microvm' ? { cores: tier.cores, memory: tier.memory } : null
          })
        };
      }

      if (action === 'spawn') {
        if (!wallet || !wolfName) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing wallet or wolfName' })
          };
        }

        const balance = await getRomulusBalance(wallet);
        const tier = getTierFromBalance(balance);

        // Trial tier = serverless wolf (existing system)
        if (tier.type === 'serverless') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              tier: 'trial',
              type: 'serverless',
              message: 'Trial wolf spawned. Hold 100K+ $ROMULUS for dedicated compute.',
              wolfId: `wolf_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
              limits: {
                duration: '24 hours',
                messages: 10
              },
              upgrade: {
                required: TIERS.basic.min,
                current: balance,
                needed: Math.max(0, TIERS.basic.min - balance)
              }
            })
          };
        }

        // Paid tier = spawn microVM
        const spawnResult = await spawnInfraVM(wallet, tier, {
          name: wolfName,
          type: wolfType || 'assistant'
        });

        return {
          statusCode: spawnResult.success ? 200 : 500,
          headers,
          body: JSON.stringify({
            ...spawnResult,
            tierName: tier.name,
            balance
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unknown action' })
      };

    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

/**
 * Get next tier info for upgrade prompts
 */
function getNextTier(currentTier) {
  const tierOrder = ['trial', 'basic', 'standard', 'pro', 'power'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex < tierOrder.length - 1) {
    const nextKey = tierOrder[currentIndex + 1];
    const next = TIERS[nextKey];
    return {
      key: nextKey,
      name: next.name,
      required: next.min,
      cores: next.cores,
      memory: next.memory
    };
  }
  
  return null; // Already at max tier
}
