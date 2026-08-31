#!/bin/sh

set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_directory/.." && pwd)
release_directory="$repository_root/apps/tui/dist/release"
entrypoint="$repository_root/apps/tui/src/main.tsx"
entitlements="$script_directory/entitlements.plist"

rm -rf "$release_directory"
mkdir -p "$release_directory"

build_archive() {
	target=$1
	archive=$2
	executable_directory="$release_directory/$archive"

	mkdir -p "$executable_directory"
	bun build --compile --no-compile-autoload-dotenv --target="$target" \
		"$entrypoint" --outfile "$executable_directory/stm"
	codesign --deep --force --sign - --entitlements "$entitlements" "$executable_directory/stm"
	codesign --verify --verbose "$executable_directory/stm"
	tar -C "$executable_directory" -czf "$release_directory/$archive.tar.gz" stm
	rm -rf "$executable_directory"
}

build_archive bun-darwin-arm64 stm-darwin-arm64
build_archive bun-darwin-x64-baseline stm-darwin-x64

(
	cd "$release_directory"
	shasum -a 256 stm-darwin-arm64.tar.gz stm-darwin-x64.tar.gz > checksums.txt
)
