#!/bin/bash
screen-wrapper-source "$@"
~/screen-wrapper-exec
rm -rf ~/screen-wrapper-exec 2>/dev/null