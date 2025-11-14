# DSM-51 Assembler Build & Test Guide

# Testing only works on Windows

## Since the official DSM51 assembler is only avaiable for windows

### DSM51 is weird

Ive added dead code optimalization which works fine, as tested but dsm51 dead code optimization is not working properly it is random as of now to know whcihc code is going to be deleted by assembling by officail dsm51

## Building the Project

Run the following commands to publish the project for each platform inside of the assembler project:

### Windows (x64)

```bash
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
```

### macOS (ARM64)

```bash
dotnet publish -c Release -r osx-arm64 --self-contained true /p:PublishSingleFile=true
```

After publishing on mac, make the output file executable:

```bash
chmod +x file
```

## Required Tools

Download the DSM-51 official assembler.
[Download](https://micromade.pl/wsparcie/biblioteka-programow/programy-do-dsm-51)

## Testing

1. Add any `.asm` file into this folder to test compilation.
2. Add compiled assembler to this folder.
3. Run the Python test script:
    ```bash
    python tester.py
    ```
