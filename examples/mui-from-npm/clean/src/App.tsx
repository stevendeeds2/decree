import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** Real @mui/material imports — clean path for Decree verify. */
export function App() {
  return (
    <Card
      sx={{
        bgcolor: 'var(--mui-palette-background-paper)',
        color: 'var(--mui-palette-text-primary)',
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5">MUI from npm (clean)</Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: 'var(--mui-palette-primary-main)' }}
          >
            Continue
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
