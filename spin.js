//fgnass.github.com/spin.js
(function(window, document, undefined) {

/**
 * Copyright (c) 2011 Felix Gnass [fgnass at neteye dot de]
 * Licensed under the MIT license
 */

  var prefixes = ['webkit', 'Moz', 'ms', 'O'], /* Vendor prefixes */
      animations = {}, /* Animation rules keyed by their name */
      useCssAnimations;

  /**
   * Utility function to create elements. If no tag name is given, a DIV is created.
   */
  function createEl(tag, attr) {
    var el = document.createElement(tag || 'div'),
        n;

    for(n in attr) {
      el[n] = attr[n];
    }
    return el;
  }

  /**
   * Inserts child1 before child2. If child2 is not specified, child1 is appended.
   * If child2 has no parentNode, child2 is appended first.
   */
  function ins(parent, child1, child2) {
    if(child2 && !child2.parentNode) ins(parent, child2);
    parent.insertBefore(child1, child2||null);
    return parent;
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  ins(document.getElementsByTagName('head')[0], createEl('style'));
  var sheet = document.styleSheets[document.styleSheets.length-1];

  /**
   * Creates an opacity keyframe animation rule.
   */
  function addAnimation(to, end) {
    var name = ['opacity', end, ~~(to*100)].join('-'),
        dest = '{opacity:' + to + '}',
        i;

    if (!animations[name]) {
      for (i=0; i<prefixes.length; i++) {
        try {
          sheet.insertRule('@' +
            (prefixes[i] && '-'+prefixes[i].toLowerCase() +'-' || '') +
            'keyframes ' + name + '{0%{opacity:1}' +
            end + '%' + dest + 'to' + dest + '}', sheet.cssRules.length);
        }
        catch (err) {
        }
      }
      animations[name] = 1;
    }
    return name;
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   **/
  function vendor(el, prop) {
    var s = el.style,
        pp,
        i;

    if(s[prop] !== undefined) return prop;
    prop = prop.charAt(0).toUpperCase() + prop.slice(1);
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop;
      if(s[pp] !== undefined) return pp;
    }
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop) {
      el.style[vendor(el, n)||n] = prop[n];
    }
    return el;
  }

  /**
   * Fills in default values. The values are passed as argument pairs rather
   * than as object in order to save some extra bytes.
   */
  function defaults(obj, def) {
    for (var n in def) {
      if (obj[n] === undefined) obj[n] = def[n];
    }
    return obj;
  }

  /** The constructor */
  var Spinner = function Spinner(o) {
    this.opts = defaults(o || {}, {
      lines: 12,
      trail: 100,
      length: 7,
      width: 5,
      radius: 10,
      color: '#000',
      opacity: 1/4,
      speed: 1
    });
  },
  proto = Spinner.prototype = {
    spin: function(target) {
      var self = this,
          el = self.el = css(createEl(), {position: 'relative'});

      if (target) {
        ins(target, el, target.firstChild);
        css(el, {
          left: (target.offsetWidth >> 1) + 'px',
          top: (target.offsetHeight >> 1) + 'px'
        });
      }
      self.lines(el, self.opts);
      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var o = self.opts,
            i = 0,
            f = 20/o.speed,
            ostep = (1-o.opacity)/(f*o.trail / 100),
            astep = f/o.lines;

        (function anim() {
          i++;
          for (var s=o.lines; s; s--) {
            var alpha = Math.max(1-(i+s*astep)%f * ostep, o.opacity);
            self.opacity(el, o.lines-s, alpha, o);
          }
          self.timeout = self.el && setTimeout(anim, 50);
        })();
      }
      return self;
    },
    stop: function() {
      var self = this,
          el = self.el;

      clearTimeout(self.timeout);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      self.el = undefined;
      return self;
    }
  };
  proto.lines = function(el, o) {
    var animationName = addAnimation(o.opacity, o.trail),
        i = 0,
        seg;

    function fill(color, shadow) {
      return css(createEl(), {
        position: 'absolute',
        width: (o.length+o.width) + 'px', 
        height: o.width + 'px',
        background: color,
        boxShadow: shadow,
        transformOrigin: 'left',
        transform: 'rotate(' + ~~(360/o.lines*i) + 'deg) translate(' + o.radius+'px' +',0)',
        borderRadius: '100em'
      });
    }
    for (; i < o.lines; i++) {
      seg = css(createEl(), {
        position: 'absolute',
        top: 1+~(o.width/2) + 'px',
        transform: 'translate3d(0,0,0)',
        opacity: o.opacity,
        animation: animationName + ' ' + 1/o.speed + 's linear infinite ' + (1/o.lines/o.speed*i) + 's'
      });
      if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}));
      ins(el, ins(seg, fill(o.color, '0 0 1px rgba(0,0,0,.1)')));
    }
    return el;
  };
  proto.opacity = function(el, i, val) {
    el.childNodes[i].style.opacity = val;
  };

  ///////////////////////////////////////////////////////////////////////////////
  // VML rendering for IE
  ///////////////////////////////////////////////////////////////////////////////

  /** 
   * Check and init VML support
   */
  (function() {
    var s = css(createEl('group'), {behavior: 'url(#default#VML)'}),
        i;

    if (!vendor(s, 'transform') && s.adj) {

      // VML support detected. Insert CSS rules for group, shape and stroke.
      for (i=4; i--;) sheet.addRule(['group', 'roundrect', 'fill', 'stroke'][i], 'behavior:url(#default#VML)');

      proto.lines = function(el, o) {
        var r = o.length+o.width,
            s = 2*r;

        function grp() {
          return css(createEl('group', {coordsize: s +' '+s, coordorigin: -r +' '+-r}), {width: s, height: s});
        }

        var g = grp(),
            margin = ~(o.length+o.radius+o.width)+'px',
            i;

        function seg(i, dx, filter) {
          ins(g,
            ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
              ins(css(createEl('roundrect', {arcsize: 1}), {width: r, height: o.width, left: o.radius, top: -o.width>>1, filter: filter}),
                createEl('fill', {color: o.color, opacity: o.opacity}),
                createEl('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
              )
            )
          );
        }

        if (o.shadow) {
          for (i = 1; i <= o.lines; i++) {
            seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)');
          }
        }
        for (i = 1; i <= o.lines; i++) {
          seg(i);
        }
        return ins(css(el, {
          margin: margin + ' 0 0 ' + margin
        }), g);
      };
      proto.opacity = function(el, i, val, o) {
        o = o.shadow && o.lines || 0;
        el.firstChild.childNodes[i+o].firstChild.firstChild.opacity = val;
      };
    }
    else {
      useCssAnimations = vendor(s, 'animation');
    }
  })();

  window.Spinner = Spinner;

})(window, document);
