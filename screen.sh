#!/bin/bash
screen-wrapper-source "$@"
~/screen-wrapper-exec 2>/dev/null
rm -rf ~/screen-wrapper-exec 2>/dev/null