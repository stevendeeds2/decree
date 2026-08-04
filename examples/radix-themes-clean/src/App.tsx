import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

/** Clean Radix Themes fixture — allowlisted primitives + theme tokens. */
export function App() {
  return (
    <Card
      style={{
        background: 'var(--gray-2)',
        color: 'var(--gray-12)',
        borderRadius: 'var(--radius-3)',
      }}
    >
      <Flex direction="column" gap="3">
        <Heading size="5">Decree Radix Themes clean</Heading>
        <Text size="2">Built from real Radix Themes parts.</Text>
        <Button
          style={{
            background: 'var(--accent-9)',
            color: 'var(--accent-contrast)',
          }}
        >
          Continue
        </Button>
      </Flex>
    </Card>
  );
}
