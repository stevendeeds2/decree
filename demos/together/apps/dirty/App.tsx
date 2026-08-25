/** Agent-forged checkout — uses what the contract did not permit. */
export function Checkout() {
  return (
    <form>
      <Button variant="ghost">Pay now</Button>
      <Button variant="secondary" size="lg">
        Express
      </Button>
      <Button style={{ background: "red" }} variant="primary">
        Paint over
      </Button>
      <Ghost tone="quiet">Old quiet</Ghost>
      <MagicButton>Invented</MagicButton>
      <button type="submit">Native</button>
    </form>
  );
}
