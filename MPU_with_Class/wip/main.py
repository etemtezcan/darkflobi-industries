import pyb
import sys
from pyb import I2C
from struct import unpack as unp
from MPU_6050 import MPU_6050
from array import array

acc_range = 2
gyro_range = 250

mpu = MPU_6050(1,1)
light = pyb.LED(4)
switch = pyb.Switch()
mpu.config_accelerometer(acc_range)
mpu.config_gyroscope(gyro_range)

rtc = pyb.RTC()
rtc.datetime((2014, 8, 14, 4, 11, 25, 0 , 0))
a = rtc.datetime()
name = '{}_{}_{}_{}_{}.csv'.format(a[0],a[1],a[2],a[4],a[5])

eps_x = 250
eps_y = 200
eps_z = 1500
norm_x = 450
norm_y = -170
norm_z = 16000
acc_x = array('i',[])
acc_y = array('i',[])
acc_z = array('i',[])
gyro_x = array('i',[])
gyro_y = array('i',[])
gyro_z = array('i',[])
tim = array('i',[])
i = 0

def get_save():
    ax, ay, az = mpu.get_acc_values()
    gx, gy, gz = mpu.get_gyro_values()
    t1 = tim4.counter()
    acc_x.append(ax)
    acc_y.append(ay)
    acc_z.append(az)
    gyro_x.append(gx)
    gyro_y.append(gy)
    gyro_z.append(gz)
    tim.append(t1-t0)
    #i += 1 (sorun çıkartıyor)

while True:
    pyb.wfi()
    if switch():
        pyb.delay(200)
        vib_data = open(name, 'w')
        ax, ay, az = mpu.get_acc_values()
        while ((abs(norm_x - ax) < eps_x) or (abs(norm_y - ay) < eps_y) or (abs(norm_z - az) < eps_z)):
            ax, ay, az = mpu.get_acc_values()
            pyb.delay(5)
        light.on()
        tim4 = pyb.Timer(4)
        tim4.init(freq=1000)
        t0 = tim4.counter()
        t1 = tim4.counter()
        tim4.callback(get_save())
        while (i < 1000):
            light.toggle()
        light.off()
        while i>0:
            i -= 1
            a_x = (acc_x[i]*acc_range)/32768
            a_y = (acc_y[i]*acc_range)/32768
            a_z = (acc_z[i]*acc_range)/32768
            g_x = (gyro_x[i]*gyro_range)/32768
            g_y = (gyro_y[i]*gyro_range)/32768
            g_z = (gyro_z[i]*gyro_range)/32768
            vib_data.write('{},{},{},{},{},{},{}\n'.format(tim[i],a_x,a_y,a_z,g_x,g_y,g_z))
        vib_data.close()
        pyb.delay(200)