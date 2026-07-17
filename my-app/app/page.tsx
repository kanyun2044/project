import * as React from 'react';
import { Box, Button, TextField, Typography } from "@mui/material";
import Link from "next/link";

export default function ColorTextFields() {

  return(
    <Box
    component="form"
      sx={{ width: 400,
        mx: "auto",
        mt: 20,
        display: "flex",
        flexDirection: "column",
        gap: 2,
         }}
    >




      <Typography variant="body2" align="center" >

        
         <Link href="/login" style={{color : "blue"}}> Login</Link>
         
      </Typography>

      <Typography variant="body2" align="center" >

        
         <Link href="/signup" style={{color : "blue"}}> signup</Link>
         
      </Typography>
    </Box>
  );
}