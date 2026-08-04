/* Intentional violations for pressure testing — must fail verify. */
import Button from './missing';

export function ForgedLink() {
  // Bare framework-shaped name with NO host import — must fail
  return <Link href="/x">go</Link>;
}

export function ForgedProvider() {
  return <ThemeProvider>{null}</ThemeProvider>;
}

export function Invented() {
  return <SuperButton>nope</SuperButton>;
}

export function NativeBypass() {
  return <button type="button">raw</button>;
}

export function HexBypass() {
  return <Button style={{ color: '#ff00aa' }}>x</Button>;
}

export function RgbBypass() {
  return <Button style={{ color: 'rgb(255, 0, 0)' }}>x</Button>;
}

export function ArbitraryBypass() {
  return <Button className="p-[13px]">x</Button>;
}

export function OkLocalShell() {
  // Local Shell under src/components — allowed under profile:app
  return <Shell><Button>ok</Button></Shell>;
}
