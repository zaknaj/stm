#!/bin/sh

set -eu

repository=${STM_GITHUB_REPOSITORY:-__GITHUB_REPOSITORY__}
release_base_url=${STM_RELEASE_BASE_URL:-"https://github.com/$repository/releases/latest/download"}

if [ "$(uname -s)" != "Darwin" ]; then
	echo "Slay the Monarch currently supports macOS only." >&2
	exit 1
fi

case "$(uname -m)" in
	arm64)
		archive=stm-darwin-arm64.tar.gz
		;;
	x86_64)
		archive=stm-darwin-x64.tar.gz
		;;
	*)
		echo "Unsupported Mac architecture: $(uname -m)" >&2
		exit 1
		;;
esac

temporary_directory=$(mktemp -d)
trap 'rm -rf "$temporary_directory"' EXIT HUP INT TERM

curl -fsSL "$release_base_url/$archive" -o "$temporary_directory/$archive"
curl -fsSL "$release_base_url/checksums.txt" -o "$temporary_directory/checksums.txt"

expected_checksum=$(awk -v archive="$archive" '$2 == archive { print $1 }' "$temporary_directory/checksums.txt")
if [ -z "$expected_checksum" ]; then
	echo "The release checksum for $archive is missing." >&2
	exit 1
fi
printf '%s  %s\n' "$expected_checksum" "$temporary_directory/$archive" | shasum -a 256 -c -

tar -xzf "$temporary_directory/$archive" -C "$temporary_directory"
install_directory=${STM_INSTALL_DIR:-"$HOME/.local/bin"}
mkdir -p "$install_directory"
install -m 755 "$temporary_directory/stm" "$install_directory/stm"

echo "Installed Slay the Monarch at $install_directory/stm"
case ":$PATH:" in
	*":$install_directory:"*)
		echo "Run: stm"
		;;
	*)
		echo "Run: $install_directory/stm"
		echo "To make 'stm' available everywhere, add $install_directory to your PATH."
		;;
esac
