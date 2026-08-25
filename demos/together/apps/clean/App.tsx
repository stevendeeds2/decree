/** Harbor checkout — uses only what the contract permits. */
export function Checkout() {
  return (
    <form>
      <Button variant="primary" size="md">
        Pay now
      </Button>
      <Button variant="secondary" size="sm" disabled>
        Hold
      </Button>
    </form>
  );
}
