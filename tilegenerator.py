#!/usr/bin/python
#-*- coding: utf-8 -*-

# LICENSE: http://creativecommons.org/publicdomain/zero/1.0/

import argparse

import os
import errno
from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont
import math
import threading
import Queue
import struct
import socket

pngtoprocess = Queue.Queue()

# size of the square
exp = 8
tilesize = pow(2, exp)
power_of_two = []
outputdir = None
zoomlevel = None

title = None

scale = [(0,255,0), (255,255,0), (255,0,0), (0,0,0)]

def getcolor(value, size):
    color = None
    if value == 0:
        color = scale[0]
    elif value >= size:
        color = scale[-1]
    else:
        if size > 1:
            details, low_bound = math.modf(value * len(scale) / float(math.log(size, 2)))
        else:
            details, low_bound = math.modf(value * len(scale))
        low_bound = int(low_bound)
        if low_bound >= len(scale) - 1:
            color = scale[-1]
        else:
            min_scale = scale[low_bound]
            max_scale = scale[low_bound + 1]
            color = []
            for c1, c2 in zip(min_scale, max_scale):
                if c1 == c2:
                    color.append(c1)
                elif c1 < c2:
                    color.append(c1 + int(details * (c2 - c1)))
                else:
                    color.append(c1 - int(details * (c1 - c2)))
    return tuple(color)

def rot(n, x, y, rx, ry):
    """
        See https://en.wikipedia.org/wiki/Hilbert_curve
    """
    if ry != 0:
        return (x,y)
    if rx == 1:
        n -= 1
        x = n - x;
        y = n - y;
    return (y,x)

def d2xy(ip_int):
    """
        See https://en.wikipedia.org/wiki/Hilbert_curve
    """
    x = 0
    y = 0
    s = 1
    for s in power_of_two:
        rx = 1 & (ip_int/2);
        ry = 1 & (ip_int ^ rx);
        x,y = rot(s,x,y,rx,ry)
        x += s * rx
        y += s * ry
        ip_int /= 4;
    return x, y

def init_tile():
    global power_of_two
    # 16 is the value to change to have more dots in a tile
    pixelnetmask = (zoomlevel * 2) + exp * 2
    imagesize = int(math.sqrt(pow(2,pixelnetmask)))
    v = 1
    power_of_two = []
    while v < imagesize:
        power_of_two.append(v)
        v *= 2
    # FIXME: dirty fix pixelnetmask cannot be > 32
    if pixelnetmask > 32:
        pixelnetmask = 32
    ipperpixel = pow(2,(32  - pixelnetmask))
    return imagesize, ipperpixel

def prepare_point(x_img, y_img, ipperpixel, count):
    x = x_img % tilesize
    y = y_img % tilesize
    color = getcolor(count, ipperpixel)
    return (x, y), color

def generate_tiles(inputfile):
    imagesize, ipperpixel = init_tile()

    with open(inputfile,'r') as f:
        count = 0
        ip = 0
        lastip = None
        tileid = None
        img = None

        for line in f:
            line = line.strip()
            if line == '':
                continue
            ip, weight = line.split(',')
            if len(weight) == 0:
                # if the dump does not contains the weight
                weight = 1
            else:
                weight = float(weight)
            ip = struct.unpack("!I", socket.inet_aton(ip))[0]

            ip = int((ip - (ip % (ipperpixel))) / ipperpixel)
            if lastip is None:
                # first line
                lastip = ip
            if lastip > ip:
                print line
                print "broken,use integer ordered ips"
                exit(0)
            if ip != lastip:
                tileid, img = make_tile(imagesize, ipperpixel,
                        tileid, ip, img, count)
                lastip = ip
                count = weight
            else:
                count += weight
        # EOF, dump last tile
        make_tile(imagesize, ipperpixel, tileid, ip, img, count, True)
    print "done"

def make_tile(imagesize, ipperpixel, lasttileid, ip, img, count, eof=False):
    x_img, y_img = d2xy(ip)

    tile_x = int(x_img / (tilesize))
    tile_y = int(y_img / (tilesize))
    tileid = (zoomlevel, tile_y, tile_x)
    if tileid != lasttileid:
        if img is not None:
            dump_tile(img, lasttileid[1], lasttileid[2])
        img = Image.new('RGB', (tilesize, tilesize), 'WHITE')
        lasttileid = tileid

    coord, color = prepare_point(x_img, y_img, ipperpixel, count)
    img.putpixel(coord, color)

    if eof:
        dump_tile(img, tile_y, tile_x)
    return lasttileid, img

def make_tile_dir(tile_y):
    dir_name = os.path.join(outputdir, str(zoomlevel), str(tile_y))
    if not os.path.exists(dir_name):
        try:
            os.makedirs(dir_name)
        except OSError as exc:
            if exc.errno == errno.EEXIST and os.path.isdir(dir_name):
                pass
            else:
                raise
    return dir_name

def dump_tile(img, tile_y, tile_x):
    cur_dir = make_tile_dir(tile_y)
    filename = os.path.join(cur_dir, str(tile_x) + '.png')
    if title is not None:
        font = ImageFont.truetype(\
                "/usr/share/fonts/truetype/ttf-dejavu/DejaVuSansMono-Bold.ttf",20)
        draw = ImageDraw.Draw(img)
        draw.text((tilesize/2, 0), title, (0,0,0), font=font)
    img.save(filename)
    #print "saved %s" % tilename
    #pngtoprocess.put("optipng -o7 %s%s/%s/%s.png" % (outputdir,lasttileid[0],lasttileid[1],lasttileid[2]))
    return filename

def addPrivateOverlay():
    """
        FIXME: Quite useless, find a way to generate it statically once for each level.
    """
    #top left corner of private or reserved ip spaces, as defined in IPy
    ips = ('0.0.0.0/8', '10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16',
            '172.16.0.0/12', '192.168.0.0/16','224.0.0.0/3')

    imagesize, ipperpixel = init_tile()

    for ip_in in ips:
        ipstr, mask = ip_in.split("/")
        overlaywidth = imagesize / math.sqrt(pow( -2,int(mask)))
        if overlaywidth > 128 or overlaywidth < 4:
            continue
        b = [long(x) for x in ipstr.split('.')]
        ip = (b[0] << 24) + (b[1] << 16) + (b[2] << 8) + b[3]
        ip = int( (ip  - (ip % ipperpixel)) / ipperpixel)

        x_img,y_img = d2xy(ip)
        tile_x = int(x_img / tilesize)
        tile_y = int(y_img / tilesize)
        x = x_img % tilesize
        y = y_img % tilesize

        filename = os.path.join(outputdir, str(zoomlevel), str(tile_y),
                str(tile_x) + '.png')
        if os.path.exists(filename):
            img = Image.open(filename)
        else:
            make_tile_dir(tile_y)
            img = Image.new('RGB', (tilesize, tilesize), 'BLACK')
        for b in range(0, int(overlaywidth), 4):
            for i in range(int(overlaywidth) - b):
                img.putpixel((x+b+i,y+i),0xcdcd00)
                img.putpixel((x+i,y+b+i),0xcdcd00)
        img.save(filename, 'PNG')

def processpng():
    while True:
        cmd = pngtoprocess.get()
        os.system(cmd)
        pngtoprocess.task_done()

def process_data(inputfile):
    global zoomlevel
    if zoomlevel is None:
        zoomlevel = 8
        while zoomlevel >= 0:
            generate_tiles(inputfile)
            #addPrivateOverlay()
            zoomlevel -= 1
    else:
        generate_tiles(inputfile)
        #addPrivateOverlay()

    return

    Threads = 4
    while Threads > 0:
        p = threading.Thread(target=processpng,)
        p.daemon = True
        p.start()
        Threads = Threads -1

    pngtoprocess.join()

if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='Build zoomlevels.')
    parser.add_argument('-i', '--inputfile', type=str, required=True,
            help='File to read. The IPs have to be sorted.')
    parser.add_argument('-o', '--outputdir', type=str, required=True,
            help='Directory where the images are written')
    parser.add_argument('-z', '--zoomlevel', default=None, type=int,
            help='Zoomlevel to build, between 0 and 8. (If not set, build all)')
    parser.add_argument('-t', '--title', default=None, type=str,
        help='Add a title. It will be put on the top of the picture, you do not want it on OpenLayer')

    args = parser.parse_args()

    zoomlevel = args.zoomlevel
    outputdir = args.outputdir
    title = args.title
    process_data(args.inputfile)

