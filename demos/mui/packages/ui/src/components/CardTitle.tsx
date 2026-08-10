import Typography, { type TypographyProps } from '@mui/material/Typography'

export function CardTitle(props: TypographyProps) {
  return <Typography variant="subtitle1" component="h3" {...props} />
}

export function CardDescription(props: TypographyProps) {
  return <Typography variant="body2" color="text.secondary" {...props} />
}
