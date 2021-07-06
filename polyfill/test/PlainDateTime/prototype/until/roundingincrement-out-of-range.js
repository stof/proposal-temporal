// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plaindatetime.prototype.until
description: RangeError thrown when roundingIncrement option out of range
info: |
    sec-temporal-totemporalroundingincrement step 6:
      6. If _increment_ < 1 or _increment_ > _maximum_, throw a *RangeError* exception.
includes: [compareArray.js]
---*/

const actual = [];
class Calendar extends Temporal.Calendar {
  constructor() {
    super("iso8601");
  }

  dateUntil(...args) {
    actual.push("dateUntil");
    return super.dateUntil(...args);
  }
}
const calendar = new Calendar();

const earlier = new Temporal.PlainDateTime(2000, 5, 2, 12, 34, 56, 0, 0, 0, calendar);
const later = new Temporal.PlainDateTime(2000, 5, 2, 12, 34, 56, 0, 0, 5, calendar);
assert.throws(RangeError, () => earlier.until(later, { roundingIncrement: -Infinity, smallestUnit: "year" }));
assert.throws(RangeError, () => earlier.until(later, { roundingIncrement: -1, smallestUnit: "year" }));
assert.throws(RangeError, () => earlier.until(later, { roundingIncrement: 0, smallestUnit: "year" }));
assert.throws(RangeError, () => earlier.until(later, { roundingIncrement: Infinity, smallestUnit: "year" }));
assert.compareArray(actual, [], "should not call dateUntil");
