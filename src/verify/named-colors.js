/** CSS named colors (CSS Color 4). `transparent`, `currentColor`, and keywords like `inherit` are allowed. */
export const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro
ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru
pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/),
);

/** Color-bearing properties, CSS (`background-color`) or JS style objects (`backgroundColor`). */
const COLOR_PROPERTY_RE =
  /(?:^|[\s;{,"'`(])(color|background(?:-color)?|backgroundColor|border(?:-(?:top|right|bottom|left))?(?:-color)?|border(?:Top|Right|Bottom|Left)?Color|outline(?:-color)?|outlineColor|fill|stroke|caret-color|caretColor|text-decoration-color|textDecorationColor)\s*:\s*['"`]?([^;}"'`\n]+)/g;

/**
 * Named colors used as values of color properties on one line.
 * @param {string} line
 * @returns {string[]}
 */
export function namedColorsInLine(line) {
  const out = [];
  for (const m of line.matchAll(COLOR_PROPERTY_RE)) {
    for (const word of m[2].toLowerCase().split(/[\s,()]+/)) {
      if (NAMED_COLORS.has(word)) out.push(word);
    }
  }
  return out;
}
