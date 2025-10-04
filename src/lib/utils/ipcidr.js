export default class IPCIDR {
  constructor(cidr) {
    this._cidr = cidr;
  }

  ip4ToInt(ip) {
    return ip.split('.').reduce((int, oct) => (int << 8) + Number.parseInt(oct, 10), 0) >>> 0;
  }

  isIp4InCidr(ip) {
    const [range, bits = 32] = this._cidr.split('/');
    const mask = ~(2 ** (32 - Number(bits)) - 1);
    return (this.ip4ToInt(ip) & mask) === (this.ip4ToInt(range) & mask);
  }
}