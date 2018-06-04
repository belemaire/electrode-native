import * as React from 'react'
import { Apple, Android } from 'mdi-material-ui'

interface PlatformIconProps {
 platformName: string,
}

const PlatformIcon: React.SFC<PlatformIconProps> = (props) => {
 switch (props.platformName) {
   case 'android': return <Android />
   case 'ios': return <Apple />
   default: return null
 }
}

export default PlatformIcon