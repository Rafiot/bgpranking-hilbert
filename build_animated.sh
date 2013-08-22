#!/bin/bash

set -x
set -e

for file in $(ls dumps/); do
    echo $file
    if [ ! -f maps/$file.png ]; then
        python tilegenerator.py -i dumps/$file -o out/$file -z 0
        cp out/$file/0/0/0.png maps/$file.png
    fi
done
convert -delay 2 maps/ips_*.png animation.gif
