import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

/** Real @radix-ui/themes imports — clean path for Decree verify. */
export function App() {
  return (
    <Card style={{ background: 'var(--gray-2)', color: 'var(--gray-12)' }}>
      <Flex direction="column" gap="3">
        <Heading size="5">Radix Themes from npm (clean)</Heading>
        <Text size="2">Allowlisted primitives only.</Text>
        <Button style={{ background: 'var(--accent-9)' }}>Continue</Button>
      </Flex>
    </Card>
  );
}
