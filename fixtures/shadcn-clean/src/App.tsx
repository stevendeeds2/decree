import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/** Clean fixture — only allowlisted shadcn-shaped primitives + CSS variables. */
export function App() {
  return (
    <main className="bg-background text-foreground p-6">
      <Card className="rounded-[var(--radius)]">
        <CardHeader>
          <CardTitle>Decree clean</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Built from the real parts.
          </p>
          <Button variant="default" className="bg-primary text-primary-foreground">
            Continue
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
