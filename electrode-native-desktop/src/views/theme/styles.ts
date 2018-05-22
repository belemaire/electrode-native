import { CSSProperties } from "react"

/**
 * Typecast objects as CSSProperties.  ¯\\_(ツ)_/¯
 */
export function cssProps(props?: CSSProperties): CSSProperties {
  return props as CSSProperties
}

const flexbox = {
  /** Flex the children vertically. */
  column: cssProps({ display: "flex", flexDirection: "column" }),

  /** Flex the children horizontally. */
  row: cssProps({ display: "flex", flexDirection: "row" }),

  /** Grow to the size of our parent. */
  flex1: cssProps({ flex: 1 }),
}


/**
 * Full screen and disable the scrolling.
 */
const fullScreen = cssProps({ overflow: "hidden", height: "100vh", ...flexbox.column })

/**
 * Style presets.
 */
export const styles = {
  ...flexbox,
  fullScreen,
}