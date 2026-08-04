import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** Clean MUI fixture — theme tokens / allowlisted components only. */
export function App() {
  return (
    <Card
      sx={{
        bgcolor: 'var(--mui-palette-background-paper)',
        color: 'var(--mui-palette-text-primary)',
        borderRadius: 'var(--mui-shape-borderRadius)',
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5">Decree MUI clean</Typography>
          <Typography variant="body2">Built from the real MUI parts.</Typography>
          <Button
            variant="contained"
            sx={{
              bgcolor: 'var(--mui-palette-primary-main)',
              color: 'var(--mui-palette-primary-contrastText)',
            }}
          >
            Continue
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
