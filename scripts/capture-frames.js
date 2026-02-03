// Quick frame capture script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const framesDir = path.join(__dirname, '..', 'assets', 'frames');
const numFrames = 90; // 3 seconds at 30fps
const delayMs = 33; // ~30fps

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureFrames() {
  console.log('Capturing frames...');
  for (let i = 0; i < numFrames; i++) {
    const padded = String(i).padStart(4, '0');
    // Use nircmd or powershell screenshot
    try {
      execSync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bitmap.Save('${framesDir}\\frame_${padded}.png'); $graphics.Dispose(); $bitmap.Dispose() }"`, { stdio: 'pipe' });
      process.stdout.write(`\rFrame ${i+1}/${numFrames}`);
    } catch (e) {
      console.error('Error:', e.message);
    }
    await sleep(delayMs);
  }
  console.log('\nDone!');
}

captureFrames();
