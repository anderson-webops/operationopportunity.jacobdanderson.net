import os
import stat
import sys
from contextlib import ExitStack
from pathlib import PurePosixPath


def read_build_input(filename):
    path = PurePosixPath(filename)
    if not path.is_absolute() or str(path) != filename or '..' in path.parts:
        raise ValueError('Build input must have a canonical absolute path')
    if len(path.parts) > 256 or len(path.parts) < 2:
        raise ValueError('Build input path must have bounded components')
    if os.open not in os.supports_dir_fd:
        raise RuntimeError('Build input reads require descriptor-relative opens')
    for name in ('O_NOFOLLOW', 'O_NONBLOCK', 'O_DIRECTORY'):
        if not getattr(os, name, 0):
            raise RuntimeError('Build input reads require supported file flags')
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    with ExitStack() as descriptors:
        parent = os.open('/', flags | os.O_DIRECTORY)
        descriptors.callback(os.close, parent)
        for component in path.parts[1:-1]:
            parent = os.open(component, flags | os.O_DIRECTORY, dir_fd=parent)
            descriptors.callback(os.close, parent)
        descriptor = os.open(path.name, flags, dir_fd=parent)
        descriptors.callback(os.close, descriptor)
        before = os.fstat(descriptor)
        limit = 8 * 1024 * 1024
        if not stat.S_ISREG(before.st_mode) or before.st_size > limit:
            raise ValueError('Build input must be bounded and regular')
        data = bytearray()
        while chunk := os.read(descriptor, 1024 * 1024):
            data.extend(chunk)
            if len(data) > limit:
                raise ValueError('Build input grew beyond its bound')
        after = os.fstat(descriptor)
        fields = ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns', 'st_mode')
        if len(data) != before.st_size or any(getattr(before, field) != getattr(after, field) for field in fields):
            raise ValueError('Build input changed while reading')
        return bytes(data)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Pass one exact build-input path')
    sys.stdout.buffer.write(read_build_input(sys.argv[1]))
