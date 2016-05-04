#!/bin/bash

echo $(cat ${1:-package.json} \
    | grep name \
    | head -1 \
    | awk -F: '{ print $2 }' \
    | sed 's/[",]//g')
