import subprocess
import os
import sys
import shutil
import threading
import time
from pathlib import Path

TIME_TO_CLOSE_DSM51 = 3.0

if sys.platform == 'win32':
    import ctypes

    user32 = ctypes.windll.user32
    
    def close_dsm51_windows():
        time.sleep(TIME_TO_CLOSE_DSM51)
        while getattr(threading.current_thread(), "do_run", True):
            hwnd = user32.FindWindowW(None, "Dsm51Ass")
            if hwnd:
                user32.PostMessageW(hwnd, 0x0010, 0, 0)  # WM_CLOSE
            time.sleep(0.1)

def assemble(exe_path, asm_file, output_dir):
    if not os.path.exists(exe_path) or not os.path.exists(asm_file):
        return False
    
    asm_dir = os.path.dirname(asm_file)
    base_name = os.path.splitext(asm_file)[0]
    
    closer_thread = None
    if sys.platform == 'win32' and "dsm51" in str(exe_path).lower():
        closer_thread = threading.Thread(target=close_dsm51_windows, daemon=True)
        closer_thread.do_run = True
        closer_thread.start()
    
    try:
        result = subprocess.run(
            [exe_path, asm_file],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=asm_dir,
            input="\n"
        )
    finally:
        if closer_thread:
            closer_thread.do_run = False
            closer_thread.join(timeout=0.5)
    
    hex_file = f"{base_name}.hex"
    if not os.path.exists(hex_file):
        return False
    
    os.makedirs(output_dir, exist_ok=True)
    
    is_custom = "assembler.exe" in str(exe_path).lower()
    
    for ext in ['.hex', '.bin', '.lst', '.obj']:
        src = f"{base_name}{ext}"
        if not os.path.exists(src):
            continue
            
        if ext == '.hex':
            dst = os.path.join(output_dir, os.path.basename(src))
            shutil.move(src, dst)
        else:
            if (is_custom and ext == '.bin') or (not is_custom and ext == '.lst'):
                os.remove(src)
            elif ext in ['.lst', '.bin', '.obj']:
                os.remove(src)
    
    return True

def compare_hex(dir1, dir2, filename):
    f1 = os.path.join(dir1, filename + '.hex')
    f2 = os.path.join(dir2, filename + '.hex')
    
    if not os.path.exists(f1) or not os.path.exists(f2):
        return False
    
    with open(f1, 'rb') as file1, open(f2, 'rb') as file2:
        return file1.read() == file2.read()

def test_file(asm_path, asm1_path, asm2_path, out1, out2):
    name = os.path.basename(asm_path)
    base = os.path.splitext(name)[0]
    
    result1 = assemble(asm1_path, asm_path, out1)
    result2 = assemble(asm2_path, asm_path, out2)
    
    if not result1 or not result2:
        print(f" X {name}")
        return False
    
    match = compare_hex(out1, out2, base)
    status = " OK " if match else " X "
    print(f"  {status} {name}")
    return match

def main():
    root = Path(__file__).parent
    test_files_dir = root / "testFiles"
    
    asm1 = root / "assembler.exe"
    asm2 = root / "Dsm51Ass.exe"
    out1 = root / "output_assembler"
    out2 = root / "output_dsm51"
    
    if out1.exists():
        shutil.rmtree(out1)
    if out2.exists():
        shutil.rmtree(out2)
    
    if not test_files_dir.exists():
        print(f"Error: testFiles folder not found")
        sys.exit(1)
    
    test_files = sorted(test_files_dir.glob("*.asm"))
    
    if not test_files:
        print("No .asm files found in testFiles folder")
        sys.exit(1)
    
    print("Running tests")
    
    results = []
    for test_path in test_files:
        passed = test_file(str(test_path), str(asm1), str(asm2), str(out1), str(out2))
        results.append(passed)
    
    total = len(results)
    passed = sum(results)
    
    print(f"\nPassed: {passed}/{total}")
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()