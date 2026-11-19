globalThis.QLENS = globalThis.QLENS || {};

(function () {
  const MAX_INPUT = 200;
  const MAX_OUTPUT = 120;

  const CONSTANTS = {
    pi: Math.PI,
    tau: Math.PI * 2,
    e: Math.E,
    phi: (1 + Math.sqrt(5)) / 2
  };

  const FUNCTIONS = {
    sqrt: { min: 1, max: 1, fn: Math.sqrt },
    cbrt: { min: 1, max: 1, fn: Math.cbrt },
    abs: { min: 1, max: 1, fn: Math.abs },
    sign: { min: 1, max: 1, fn: Math.sign },
    round: { min: 1, max: 1, fn: Math.round },
    floor: { min: 1, max: 1, fn: Math.floor },
    ceil: { min: 1, max: 1, fn: Math.ceil },
    trunc: { min: 1, max: 1, fn: Math.trunc },
    exp: { min: 1, max: 1, fn: Math.exp },
    ln: { min: 1, max: 1, fn: Math.log },
    log: { min: 1, max: 1, fn: Math.log10 },
    log2: { min: 1, max: 1, fn: Math.log2 },
    log10: { min: 1, max: 1, fn: Math.log10 },
    sin: { min: 1, max: 1, fn: Math.sin },
    cos: { min: 1, max: 1, fn: Math.cos },
    tan: { min: 1, max: 1, fn: Math.tan },
    asin: { min: 1, max: 1, fn: Math.asin },
    acos: { min: 1, max: 1, fn: Math.acos },
    atan: { min: 1, max: 1, fn: Math.atan },
    sinh: { min: 1, max: 1, fn: Math.sinh },
    cosh: { min: 1, max: 1, fn: Math.cosh },
    tanh: { min: 1, max: 1, fn: Math.tanh },
    asinh: { min: 1, max: 1, fn: Math.asinh },
    acosh: { min: 1, max: 1, fn: Math.acosh },
    atanh: { min: 1, max: 1, fn: Math.atanh },
    pow: { min: 2, max: 2, fn: Math.pow },
    atan2: { min: 2, max: 2, fn: Math.atan2 },
    hypot: { min: 1, max: Infinity, fn: Math.hypot },
    min: { min: 1, max: Infinity, fn: Math.min },
    max: { min: 1, max: Infinity, fn: Math.max }
  };

  const LEAD_IN = /^(?:what(?:'s| is)|how much is|calculate|compute|evaluate|calc)\s+(.+)$/i;
  const DATE_LIKE = [
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/,
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/
  ];
  const PHONE_LIKE = /^[+\d\s().-]+$/;

  function CalcError(message) {
    this.name = 'CalcError';
    this.message = message;
  }
  CalcError.prototype = Object.create(Error.prototype);

  function normalize(raw) {
    let text = String(raw == null ? '' : raw).trim();
    if (!text || text.length > MAX_INPUT) return null;

    let explicit = false;
    if (text.charAt(0) === '=') {
      explicit = true;
      text = text.slice(1).trim();
    }

    const lead = LEAD_IN.exec(text);
    if (lead) text = lead[1].trim();

    if (text.endsWith('?')) text = text.slice(0, -1).trim();
    if (!text) return null;

    text = text
      .replace(/[×✕]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[−–—]/g, '-')
      .replace(/π/g, 'pi')
      .replace(/\*\*/g, '^')
      .replace(/\bplus\b/gi, '+')
      .replace(/\bminus\b/gi, '-')
      .replace(/\b(?:times|multiplied by)\b/gi, '*')
      .replace(/\bdivided by\b/gi, '/')
      .replace(/\bto the power of\b/gi, '^')
      .replace(/\bmod(?:ulo)?\b/gi, '%')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return null;
    return { text, explicit };
  }

  function isDateLike(text) {
    for (const re of DATE_LIKE) if (re.test(text)) return true;
    return false;
  }

  function isPhoneLike(text) {
    if (!PHONE_LIKE.test(text)) return false;
    if (isDateLike(text)) return false;
    const digits = (text.match(/\d/g) || []).length;
    return digits >= 9;
  }

  function isCandidate(text) {
    if (!text || text.length > MAX_INPUT) return false;
    if (isDateLike(text) || isPhoneLike(text)) return false;
    if (/[@#$&?!"'`{}[\];:]/.test(text)) return false;

    const hasDigit = /\d/.test(text);
    const hasName = /\b(?:pi|tau|phi|e)\b/i.test(text);
    if (!hasDigit && !hasName) return false;

    const hasOperator = /[+\-*/^%]/.test(text);
    const hasFunction = /[a-z][a-z0-9]*\s*\(/i.test(text);
    const hasPercentOf = /%\s*of\b/i.test(text);
    const hasImplicit = /\d\s*(?:pi|tau|phi)\b/i.test(text) || /\d\s*\(/.test(text);
    return hasOperator || hasFunction || hasPercentOf || hasImplicit;
  }

  function isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  function isLetter(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  function tokenize(text) {
    const tokens = [];
    let i = 0;

    while (i < text.length) {
      const ch = text.charAt(i);

      if (ch === ' ') {
        i++;
        continue;
      }
      if (ch === '(' || ch === ')') {
        tokens.push({ type: ch === '(' ? 'lparen' : 'rparen' });
        i++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ type: 'comma' });
        i++;
        continue;
      }
      if ('+-*/^%'.indexOf(ch) !== -1) {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }

      const rest = text.slice(i);

      if (isDigit(ch) || (ch === '.' && isDigit(text.charAt(i + 1)))) {
        let m = /^0[xX][0-9a-fA-F]+/.exec(rest);
        if (m) {
          tokens.push({ type: 'num', value: parseInt(m[0].slice(2), 16) });
          i += m[0].length;
          continue;
        }
        m = /^0[bB][01]+/.exec(rest);
        if (m) {
          tokens.push({ type: 'num', value: parseInt(m[0].slice(2), 2) });
          i += m[0].length;
          continue;
        }
        m = /^0[oO][0-7]+/.exec(rest);
        if (m) {
          tokens.push({ type: 'num', value: parseInt(m[0].slice(2), 8) });
          i += m[0].length;
          continue;
        }
        m = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest)
          || /^\.\d+(?:[eE][+-]?\d+)?/.exec(rest);
        if (!m) throw new CalcError('Invalid number');
        tokens.push({ type: 'num', value: Number(m[0].replace(/,/g, '')) });
        i += m[0].length;
        continue;
      }

      if (isLetter(ch)) {
        const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
        if (!m) throw new CalcError('Invalid name');
        tokens.push({ type: 'name', value: m[0].toLowerCase() });
        i += m[0].length;
        continue;
      }

      throw new CalcError('Unsupported character');
    }

    tokens.push({ type: 'eof' });
    return tokens;
  }

  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  Parser.prototype.peek = function (offset) {
    const at = this.pos + (offset || 0);
    return this.tokens[at] || this.tokens[this.tokens.length - 1];
  };

  Parser.prototype.take = function () {
    return this.tokens[this.pos++];
  };

  Parser.prototype.matchOp = function (value) {
    const t = this.peek();
    if (t.type === 'op' && t.value === value) {
      this.pos++;
      return true;
    }
    return false;
  };

  Parser.prototype.matchName = function (value) {
    const t = this.peek();
    if (t.type === 'name' && t.value === value) {
      this.pos++;
      return true;
    }
    return false;
  };

  Parser.prototype.parse = function () {
    const value = this.parseExpression();
    if (this.peek().type !== 'eof') throw new CalcError('Unexpected input');
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new CalcError('Not a finite number');
    return value;
  };

  Parser.prototype.parseExpression = function () {
    return this.parseAdditive();
  };

  Parser.prototype.parseAdditive = function () {
    let value = this.parseMultiplicative();
    for (;;) {
      if (this.matchOp('+')) value += this.parseMultiplicative();
      else if (this.matchOp('-')) value -= this.parseMultiplicative();
      else break;
    }
    return value;
  };

  Parser.prototype.prevWasPercent = function () {
    const t = this.tokens[this.pos - 1];
    return Boolean(t && t.type === 'op' && t.value === '%');
  };

  Parser.prototype.parseMultiplicative = function () {
    let value = this.parseUnary();
    let percentFactor = this.prevWasPercent();

    for (;;) {
      const next = this.peek();

      if (next.type === 'op' && (next.value === '*' || next.value === '/' || next.value === '%')) {
        this.pos++;
        const rhs = this.parseUnary();
        if (next.value === '*') value *= rhs;
        else if (next.value === '/') {
          if (rhs === 0) throw new CalcError('Division by zero');
          value /= rhs;
        } else {
          if (rhs === 0) throw new CalcError('Division by zero');
          value %= rhs;
        }
        percentFactor = this.prevWasPercent();
        continue;
      }

      if (next.type === 'name' && next.value === 'of') {
        if (!percentFactor) throw new CalcError('Expected a percentage before "of"');
        this.pos++;
        value *= this.parseUnary();
        percentFactor = this.prevWasPercent();
        continue;
      }

      if (next.type === 'lparen' || next.type === 'name') {
        value *= this.parseUnary();
        percentFactor = this.prevWasPercent();
        continue;
      }

      break;
    }
    return value;
  };

  Parser.prototype.parseUnary = function () {
    if (this.matchOp('+')) return this.parseUnary();
    if (this.matchOp('-')) return -this.parseUnary();
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    const base = this.parsePostfix();
    if (this.matchOp('^')) return Math.pow(base, this.parseUnary());
    return base;
  };

  Parser.prototype.parsePostfix = function () {
    let value = this.parsePrimary();
    while (this.peek().type === 'op' && this.peek().value === '%') {
      const after = this.peek(1);
      const isPostfix = after.type === 'eof'
        || after.type === 'rparen'
        || after.type === 'comma'
        || (after.type === 'op' && after.value !== '%')
        || (after.type === 'name' && after.value === 'of');
      if (!isPostfix) break;
      this.pos++;
      value /= 100;
    }
    return value;
  };

  Parser.prototype.parsePrimary = function () {
    const t = this.peek();

    if (t.type === 'num') {
      this.pos++;
      return t.value;
    }

    if (t.type === 'lparen') {
      this.pos++;
      const value = this.parseExpression();
      if (this.peek().type !== 'rparen') throw new CalcError('Missing closing parenthesis');
      this.pos++;
      return value;
    }

    if (t.type === 'name') {
      this.pos++;
      const name = t.value;

      if (this.peek().type === 'lparen') {
        this.pos++;
        const args = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek().type === 'comma') {
            this.pos++;
            args.push(this.parseExpression());
          }
        }
        if (this.peek().type !== 'rparen') throw new CalcError('Missing closing parenthesis');
        this.pos++;
        return applyFunction(name, args);
      }

      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) return CONSTANTS[name];
      throw new CalcError('Unknown name');
    }

    throw new CalcError('Expected a value');
  };

  function applyFunction(name, args) {
    const spec = FUNCTIONS[name];
    if (!spec) throw new CalcError('Unknown function');
    if (args.length < spec.min || args.length > spec.max) throw new CalcError('Wrong argument count');
    const value = spec.fn.apply(null, args);
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new CalcError('Undefined result');
    return value;
  }

  function roundValue(value) {
    if (!Number.isFinite(value)) return null;
    const rounded = Number(value.toPrecision(12));
    if (!Number.isFinite(rounded)) return null;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function formatNumber(value) {
    const n = roundValue(value);
    if (n == null) return '';
    const abs = Math.abs(n);

    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
      return n.toExponential(9)
        .replace(/\.?0+e/, 'e')
        .replace('e+', 'e');
    }

    if (abs !== 0 && abs < 1e-6) {
      const fixed = n.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
      if (fixed && fixed !== '0') return fixed;
    }

    const plain = String(n);
    if (plain.indexOf('e') !== -1) return plain;

    const negative = plain.charAt(0) === '-';
    const body = negative ? plain.slice(1) : plain;
    const dot = body.indexOf('.');
    const whole = dot === -1 ? body : body.slice(0, dot);
    const fraction = dot === -1 ? '' : body.slice(dot);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (negative ? '-' : '') + grouped + fraction;
  }

  function canonicalNumber(value) {
    const n = roundValue(value);
    if (n == null) return '';
    const s = String(n);
    return s.replace('e+', 'e');
  }

  function detect(raw) {
    const normalized = normalize(raw);
    if (!normalized) return null;
    const text = normalized.text;
    if (!normalized.explicit && !isCandidate(text)) return null;

    let value;
    try {
      const tokens = tokenize(text);
      value = new Parser(tokens).parse();
    } catch (err) {
      return null;
    }

    const rounded = roundValue(value);
    if (rounded == null) return null;
    const display = formatNumber(rounded);
    const copy = canonicalNumber(rounded);
    if (!display || !copy || display.length > MAX_OUTPUT || copy.length > MAX_OUTPUT) return null;

    return {
      input: String(raw == null ? '' : raw).trim(),
      expression: text,
      value: rounded,
      display,
      copy
    };
  }

  QLENS.Calc = {
    detect,
    format: formatNumber,
    isCandidate
  };
})();
