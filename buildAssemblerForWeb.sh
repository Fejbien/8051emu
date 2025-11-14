#!/bin/bash
cd "$(dirname "$0")/assembler/AssemblerWasm" || exit 1
dotnet publish -c Release -o bin/Release/publish

if [ $? -ne 0 ]; then
    echo "Error: Build failed!"
    exit 1
fi

mkdir -p ../../frontend/public/assets/assembler/_framework

cp -r bin/Release/publish/wwwroot/_framework/* ../../frontend/public/assets/assembler/_framework/

ls -lh ../../frontend/public/assets/assembler/_framework/ | head -10
