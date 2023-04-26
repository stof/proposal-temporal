import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { equal, throws } = assert;

import { TimeDuration } from '../lib/timeduration.mjs';

function check(timeDuration, sec, subsec) {
  equal(timeDuration.sec, sec);
  equal(timeDuration.subsec, subsec);
}

describe('Normalized time duration', () => {
  describe('construction', () => {
    it('basic', () => {
      check(new TimeDuration(123456789, 987654321), 123456789, 987654321);
      check(new TimeDuration(-987654321, -123456789), -987654321, -123456789);
    });

    it('either sign with zero in the other component', () => {
      check(new TimeDuration(0, 123), 0, 123);
      check(new TimeDuration(0, -123), 0, -123);
      check(new TimeDuration(123, 0), 123, 0);
      check(new TimeDuration(-123, 0), -123, 0);
    });

    it('-0 is normalized', () => {
      const d = new TimeDuration(-0, -0);
      check(d, 0, 0);
      assert(!Object.is(d.sec, -0));
      assert(!Object.is(d.subsec, -0));
    });
  });

  describe('construction impossible', () => {
    it('out of range', () => {
      throws(() => new TimeDuration(2 ** 53, 0));
      throws(() => new TimeDuration(-(2 ** 53), 0));
      throws(() => new TimeDuration(Number.MAX_SAFE_INTEGER, 1e9));
      throws(() => new TimeDuration(-Number.MAX_SAFE_INTEGER, -1e9));
    });

    it('not an integer', () => {
      throws(() => new TimeDuration(Math.PI, 0));
      throws(() => new TimeDuration(0, Math.PI));
    });

    it('mixed signs', () => {
      throws(() => new TimeDuration(1, -1));
      throws(() => new TimeDuration(-1, 1));
    });
  });

  describe('normalize()', () => {
    it('basic', () => {
      check(TimeDuration.normalize(1, 1, 1, 1, 1, 1, 1), 90061, 1001001);
      check(TimeDuration.normalize(-1, -1, -1, -1, -1, -1, -1), -90061, -1001001);
    });

    it('overflow from one unit to another', () => {
      check(TimeDuration.normalize(1, 25, 61, 61, 998, 1000, 1000), 180121, 999001000);
      check(TimeDuration.normalize(-1, -25, -61, -61, -998, -1000, -1000), -180121, -999001000);
    });

    it('overflow from subseconds to seconds', () => {
      check(TimeDuration.normalize(0, 0, 0, 1, 1000, 0, 0), 2, 0);
      check(TimeDuration.normalize(0, 0, 0, -1, -1000, 0, 0), -2, 0);
    });

    it('multiple overflows from subseconds to seconds', () => {
      check(TimeDuration.normalize(0, 0, 0, 0, 1234567890, 1234567890, 1234567890), 1235803, 692457890);
      check(TimeDuration.normalize(0, 0, 0, 0, -1234567890, -1234567890, -1234567890), -1235803, -692457890);
    });

    it('fails on overflow', () => {
      throws(() => TimeDuration.normalize(104249991375, 0, 0, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(-104249991375, 0, 0, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 2501999792984, 0, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, -2501999792984, 0, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 150119987579017, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, -150119987579017, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, 2 ** 53, 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, -(2 ** 53), 0, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, Number.MAX_SAFE_INTEGER, 1000, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, -Number.MAX_SAFE_INTEGER, -1000, 0, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, Number.MAX_SAFE_INTEGER, 0, 1000000, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, -Number.MAX_SAFE_INTEGER, 0, -1000000, 0), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, Number.MAX_SAFE_INTEGER, 0, 0, 1000000000), RangeError);
      throws(() => TimeDuration.normalize(0, 0, 0, -Number.MAX_SAFE_INTEGER, 0, 0, -1000000000), RangeError);
    });
  });

  describe('add', () => {
    // TODO
  });

  describe('addToEpochNs()', () => {
    // TODO
  });

  describe('cmp()', () => {
    it('equal', () => {
      const d1 = new TimeDuration(123, 456);
      const d2 = new TimeDuration(123, 456);
      equal(d1.cmp(d2), 0);
      equal(d2.cmp(d1), 0);
    });

    it('unqeual', () => {
      const smaller = new TimeDuration(123, 456);
      const larger = new TimeDuration(654, 321);
      equal(smaller.cmp(larger), -1);
      equal(larger.cmp(smaller), 1);
    });

    it('cross sign', () => {
      const neg = new TimeDuration(-654, -321);
      const pos = new TimeDuration(123, 456);
      equal(neg.cmp(pos), -1);
      equal(pos.cmp(neg), 1);
    });
  });

  describe('divmod', () => {
    it('quotient larger than seconds', () => {
      const d = TimeDuration.normalize(5, 25, 0, 86401, 333, 666, 999);
      const { quotient, remainder } = d.divmod(86400e9);
      equal(quotient, 7);
      check(remainder, 3601, 333666999);
    });

    it('quotient smaller than seconds', () => {
      const d = new TimeDuration(90061, 333666999);
      const result1 = d.divmod(1000);
      equal(result1.quotient, 90061333666);
      check(result1.remainder, 0, 999);

      const result2 = d.divmod(10);
      equal(result2.quotient, 9006133366699);
      check(result2.remainder, 0, 9);

      const result3 = d.divmod(3);
      equal(result3.quotient, 30020444555666);
      check(result3.remainder, 0, 1);
    });
  });

  it('isZero()', () => {
    assert(new TimeDuration(0, 0).isZero());
    assert(!new TimeDuration(1, 0).isZero());
    assert(!new TimeDuration(0, -1).isZero());
    assert(!new TimeDuration(1, 1).isZero());
  });

  it('sign()', () => {
    equal(new TimeDuration(0n).sign(), 0);
    equal(new TimeDuration(-1n).sign(), -1);
    equal(new TimeDuration(-1_000_000_000n).sign(), -1);
    equal(new TimeDuration(1n).sign(), 1);
    equal(new TimeDuration(1_000_000_000n).sign(), 1);
  });

  describe('subtract', () => {
    it('basic', () => {
      const d1 = new TimeDuration(321, 987654321);
      const d2 = new TimeDuration(123, 123456789);
      check(d1.subtract(d2), 198, 864197532);
      check(d2.subtract(d1), -198, -864197532);
    });

    it('signs differ in result', () => {
      const d1 = new TimeDuration(3661, 1001001);
      const d2 = new TimeDuration(86400, 0);
      check(d1.subtract(d2), -82738, -998998999);
      check(d2.subtract(d1), 82738, 998998999);
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
