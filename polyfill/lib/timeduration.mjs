import bigInt from 'big-integer';

const MathAbs = Math.abs;
const MathSign = Math.sign;
const MathTrunc = Math.trunc;
const NumberIsSafeInteger = Number.isSafeInteger;

export class TimeDuration {
  static MAX = bigInt('9007199254740991999999999');
  static ZERO = new TimeDuration(bigInt.zero);

  constructor(sec, subsec) {
    if (!NumberIsSafeInteger(sec)) throw new Error('assertion failed: [[Seconds]] is a safe integer');
    if (!NumberIsSafeInteger(subsec)) throw new Error('assertion failed: [[Subseconds]] is a safe integer');
    if (MathAbs(subsec) > 999_999_999) throw new Error('assertion failed: |[[Subseconds]]| < 1e9');
    if (sec && subsec && MathSign(sec) !== MathSign(subsec)) throw new Error('assertion failed: signs equal');
    this.sec = sec ? sec : 0; // handle -0
    this.subsec = subsec ? subsec : 0;
  }

  static normalize(d, h, min, s, ms, µs, ns) {
    let subsec = (ns % 1e9) + (µs % 1e6) * 1e3 + (ms % 1e3) * 1e6;
    const sec =
      d * 86400 +
      h * 3600 +
      min * 60 +
      s +
      MathTrunc(ms / 1e3) +
      MathTrunc(µs / 1e6) +
      MathTrunc(ns / 1e9) +
      MathTrunc(subsec / 1e9);
    if (!NumberIsSafeInteger(sec)) {
      throw new RangeError('total of duration time units cannot exceed 9007199254740991.999999999 s');
    }
    subsec %= 1e9;
    return new TimeDuration(sec, subsec);
  }

  static fromEpochNsDiff(bigNs1, bigNs2) {
    const diff = bigNs1.subtract(bigNs2);
    const { quotient, remainder } = diff.divmod(1e9);
    return new TimeDuration(quotient.toJSNumber(), remainder.toJSNumber());
  }

  abs() {
    return new TimeDuration(MathAbs(this.sec), MathAbs(this.subsec));
  }

  add(other) {
    const newTotal = this.totalNs.add(other.totalNs);
    if (newTotal.abs().greater(TimeDuration.MAX)) {
      throw new RangeError('sum of duration time units cannot exceed 9007199254740991.999999999 s');
    }
    return new TimeDuration(newTotal);
  }

  addToEpochNs(epochNs) {
    return epochNs.add(this.subsec).add(bigInt(this.sec).multiply(1e9));
  }

  cmp(other) {
    if (this.sec > other.sec) return 1;
    if (this.sec < other.sec) return -1;
    if (this.subsec > other.subsec) return 1;
    if (this.subsec < other.subsec) return -1;
    return 0;
  }

  div(n) {
    const { quotient, remainder } = this.divmod(n);
    return quotient + remainder.totalNs.toJSNumber() / n;
  }

  divmod(n) {
    const subsecRemainder = this.subsec % n;
    // FIXME: 90061333666999 % 3 === 1, while 333666999 %3 === 0
    const subsecQuotient = MathTrunc(this.subsec / n);
    const secDivisor = n / 1e9;
    const secRemainder = MathTrunc(this.sec % secDivisor);
    const secQuotient = MathTrunc(this.sec / secDivisor);
    return {
      quotient: secQuotient + subsecQuotient,
      remainder: new TimeDuration(secRemainder, subsecRemainder)
    };
  }

  isZero() {
    return this.sec === 0 && this.subsec === 0;
  }

  round(increment, mode) {
    if (increment === 1) return this;
    let { quotient, remainder } = this.totalNs.divmod(increment);
    if (remainder.equals(bigInt.zero)) return this;
    const sign = remainder.lt(bigInt.zero) ? -1 : 1;
    const tiebreaker = remainder.multiply(2).abs();
    const tie = tiebreaker.equals(increment);
    const expandIsNearer = tiebreaker.gt(increment);
    switch (mode) {
      case 'ceil':
        if (sign > 0) quotient = quotient.add(sign);
        break;
      case 'floor':
        if (sign < 0) quotient = quotient.add(sign);
        break;
      case 'expand':
        // always expand if there is a remainder
        quotient = quotient.add(sign);
        break;
      case 'trunc':
        // no change needed, because divmod is a truncation
        break;
      case 'halfCeil':
        if (expandIsNearer || (tie && sign > 0)) quotient = quotient.add(sign);
        break;
      case 'halfFloor':
        if (expandIsNearer || (tie && sign < 0)) quotient = quotient.add(sign);
        break;
      case 'halfExpand':
        // "half up away from zero"
        if (expandIsNearer || tie) quotient = quotient.add(sign);
        break;
      case 'halfTrunc':
        if (expandIsNearer) quotient = quotient.add(sign);
        break;
      case 'halfEven': {
        if (expandIsNearer || (tie && quotient.isOdd())) quotient = quotient.add(sign);
        break;
      }
    }
    const rounded = quotient.multiply(increment);
    if (rounded.abs().greater(TimeDuration.MAX)) {
      throw new RangeError('rounded duration time units cannot exceed 9007199254740991.999999999 s');
    }
    return new TimeDuration(rounded);
  }

  sign() {
    if (this.sec === 0) return MathSign(this.subsec);
    return MathSign(this.sec);
  }

  subtract(other) {
    let sec = this.sec - other.sec;
    let subsec = this.subsec - other.subsec;
    sec += MathTrunc(subsec / 1e9);
    subsec %= 1e9;
    if (sec && subsec && MathSign(sec) !== MathSign(subsec)) {
      const sign = MathSign(sec);
      sec -= sign;
      subsec += sign * 1e9;
    }
    return new TimeDuration(sec, subsec);
  }
}
