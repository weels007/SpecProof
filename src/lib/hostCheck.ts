/**
 * Mirrors the contract's URL guard so a case cannot be opened for a host
 * the evaluation would refuse: credentials, local names, loopback, private,
 * link-local and shared address ranges.
 */
export function publicHostProblem(url: URL): string | null {
  if (url.username || url.password) {
    return 'The website URL cannot contain credentials.';
  }

  const host = url.hostname.toLowerCase();
  if (!host || !host.includes('.')) {
    return 'Use a public website address, not a local name.';
  }

  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host.endsWith('.home.arpa')
  ) {
    return 'Use a public website address; local hosts cannot be checked.';
  }

  const octets = host.split('.').map((part) => Number(part));
  const isIpv4 =
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255);

  if (isIpv4) {
    const [first, second] = octets;
    if (first === 0 || first === 10 || first === 127) {
      return 'Private and loopback addresses cannot be checked.';
    }
    if (first === 169 && second === 254) {
      return 'Link-local and metadata addresses cannot be checked.';
    }
    if (first === 172 && second >= 16 && second <= 31) {
      return 'Private addresses cannot be checked.';
    }
    if (first === 192 && second === 168) {
      return 'Private addresses cannot be checked.';
    }
    if (first === 100 && second >= 64 && second <= 127) {
      return 'Shared address space cannot be checked.';
    }
  }

  return null;
}
