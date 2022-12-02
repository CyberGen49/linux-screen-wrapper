#!/bin/bash
screen-wrapper-source "$@"
/tmp/screen-wrapper-exec 2>/dev/null
rm -rf /tmp/screen-wrapper-exec 2>/dev/null