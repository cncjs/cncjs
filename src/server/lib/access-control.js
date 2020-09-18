import rangeCheck from 'range_check';
import settings from '../config/settings';

const whitelist = [
  // IPv4 reserved space
  '127.0.0.0/8', // Used for loopback addresses to the local host
  '10.0.0.0/8', // Used for local communications within a private network
  '172.16.0.0/12', // Used for local communications within a private network
  '192.168.0.0/16', // Used for local communications within a private network
  '169.254.0.0/16', // Link-local address

  // IPv4 mapped IPv6 address
  '::ffff:10.0.0.0/8',
  '::ffff:127.0.0.0/8',
  '::ffff:172.16.0.0/12',
  '::ffff:192.168.0.0/16',

  // IPv6 reserved space
  '::1/128', // loopback address to the local host
  'fc00::/7', // Unique local address
  'fe80::/10', // Link-local address
];

export const isAllowedIPAddress = (ipaddr) => {
  let pass = !!(settings.allowRemoteAccess);
  pass = pass || whitelist.some(test => rangeCheck.inRange(ipaddr, test));

  return pass;
};
