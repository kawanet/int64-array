// int64-array.js

/*jshint -W018 */ // Confusing use of '!'.
/*jshint -W030 */ // Expected an assignment or function call and instead saw an expression.
/*jshint -W093 */ // Did you mean to return a conditional instead of an assignment?

var Uint64BE, Int64BE;

!function(exports) {
  // constructors

  var U = exports.Uint64BE = Uint64BE = function(buffer, offset, value, raddix) {
    if (!(this instanceof Uint64BE)) return new Uint64BE(buffer, offset, value, raddix);
    return init(this, buffer, offset, value, raddix);
  };

  var I = exports.Int64BE = Int64BE = function(buffer, offset, value, raddix) {
    if (!(this instanceof Int64BE)) return new Int64BE(buffer, offset, value, raddix);
    return init(this, buffer, offset, value, raddix);
  };

  // constants

  var UNDEFIND = "undefined";
  var ZERO = [0, 0, 0, 0, 0, 0, 0, 0];
  var isArray = Array.isArray || _isArray;
  var _toString = Object.prototype.toString;
  var BIT32 = 4294967296;
  var BIT24 = 16777216;

  // initializer

  function init(that, buffer, offset, value, raddix) {
    if (isStorage(buffer, offset)) {
      that.buffer = buffer;
      that.offset = offset = offset | 0;
      if (UNDEFIND === typeof value) return;
      setValue(buffer, offset, value, raddix);
    } else {
      setValue((that.buffer = new Array(8)), 0, buffer, offset);
    }
  }

  function setValue(buffer, offset, value, raddix) {
    if (isStorage(value, offset)) {
      fromArray(buffer, offset, value, raddix | 0);
    } else if ("string" === typeof value) {
      fromString(buffer, offset, value, raddix || 10);
    } else if ("number" === typeof raddix) {
      writeUInt32BE(buffer, offset, value); // high
      writeUInt32BE(buffer, offset + 4, raddix); // low
    } else if (value > 0) {
      fromPositive(buffer, offset, value); // positive
    } else if (value < 0) {
      fromNegative(buffer, offset, value); // negative
    } else {
      fromArray(buffer, offset, ZERO, 0); // zero, NaN and others
    }
  }

  // member methods

  var UPROTO = U.prototype;
  var IPROTO = I.prototype;

  UPROTO.buffer = IPROTO.buffer = void 0;

  UPROTO.offset = IPROTO.offset = 0;

  UPROTO.fragment = IPROTO.fragment = false;

  UPROTO.toNumber = function() {
    var buffer = this.buffer;
    var offset = this.offset;
    var high = readUInt32BE(buffer, offset);
    var low = readUInt32BE(buffer, offset + 4);
    return high ? (high * BIT32 + low) : low;
  };

  IPROTO.toNumber = function() {
    var buffer = this.buffer;
    var offset = this.offset;
    var high = readUInt32BE(buffer, offset) | 0; // a trick to get signed
    var low = readUInt32BE(buffer, offset + 4);
    return high ? (high * BIT32 + low) : low;
  };

  UPROTO.toArray = IPROTO.toArray = function(raw) {
    var buffer = this.buffer;
    var offset = this.offset;
    if (raw !== false && offset === 0 && buffer.length === 8 && isArray(buffer)) return buffer;
    return newArray(buffer, offset);
  };

  IPROTO.toString = function(radix) {
    var buffer = this.buffer;
    var offset = this.offset;
    var sign = (buffer[offset] & 0x80) ? "-" : "";
    if (sign) neg(buffer = newArray(buffer, offset), 0);
    return sign + toString(buffer, offset, radix);
  };

  UPROTO.toString = function(radix) {
    return toString(this.buffer, this.offset, radix);
  };

  UPROTO.toJSON = IPROTO.toJSON = function() {
    return this.toString(10);
  };

  // private methods

  function isStorage(buffer, offset) {
    var len = buffer && buffer.length;
    return len && (offset + 8 <= len) && ("string" !== typeof buffer[offset]);
  }

  function fromArray(destbuf, destoff, srcbuf, srcoff) {
    destoff |= 0;
    srcoff |= 0;
    for (var i = 0; i < 8; i++) {
      destbuf[destoff++] = srcbuf[srcoff++] & 255;
    }
  }

  function neg(buffer, offset) {
    var p = 1;
    var z = 0;
    var sign = buffer[offset] & 0x80;
    buffer[offset] &= 0x7F;
    for (var i = offset + 7; i >= offset; i--) {
      var q = (buffer[i] ^ 255) + p;
      p = (q > 255) ? 1 : 0;
      z |= (buffer[i] = (p ? 0 : q));
    }
    buffer[offset] &= 0x7F;
    // 0 never goes negative: -0 = 0
    // INT64_MIN never goes positive: -INT64_MIN = (INT64_MAX+1) = INT64_MIN
    if (!z ^ !sign) buffer[offset] |= 0x80;
  }

  function fromString(buffer, offset, str, raddix) {
    var pos = 0;
    var len = str.length;
    var high = 0;
    var low = 0;
    if (str[0] === "-") pos++;
    var sign = pos;
    while (pos < len) {
      var chr = parseInt(str[pos++], raddix);
      if (!(chr >= 0)) break; // NaN
      low = low * raddix + chr;
      high = high * raddix + Math.floor(low / BIT32);
      low %= BIT32;
    }
    writeUInt32BE(buffer, offset, high);
    writeUInt32BE(buffer, offset + 4, low);
    if (sign) neg(buffer, offset);
  }

  function toString(buffer, offset, radix) {
    var str = "";
    var high = readUInt32BE(buffer, offset);
    var low = readUInt32BE(buffer, offset + 4);
    radix = radix || 10;
    while (1) {
      var mod = (high % radix) * BIT32 + low;
      high = Math.floor(high / radix);
      low = Math.floor(mod / radix);
      str = (mod % radix).toString(radix) + str;
      if (!high && !low) break;
    }
    return str;
  }

  function newArray(buffer, offset) {
    return Array.prototype.slice.call(buffer, offset, offset + 8);
  }

  function readUInt32BE(buffer, offset) {
    return (buffer[offset++] * BIT24) + (buffer[offset++] << 16) + (buffer[offset++] << 8) + buffer[offset];
  }

  function writeUInt32BE(buffer, offset, value) {
    buffer[offset + 3] = value & 255;
    value = value >> 8;
    buffer[offset + 2] = value & 255;
    value = value >> 8;
    buffer[offset + 1] = value & 255;
    value = value >> 8;
    buffer[offset] = value & 255;
  }

  function fromPositive(buffer, offset, value) {
    for (var i = offset + 7; i >= offset; i--) {
      buffer[i] = value & 255;
      value /= 256;
    }
  }

  function fromNegative(buffer, offset, value) {
    value++;
    for (var i = offset + 7; i >= offset; i--) {
      buffer[i] = ((-value) & 255) ^ 255;
      value /= 256;
    }
  }

  // https://github.com/retrofox/is-array
  function _isArray(val) {
    return !!val && '[object Array]' == _toString.call(val);
  }

}(this || {});