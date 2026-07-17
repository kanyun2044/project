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


      <Typography variant="body1" align="center" >
        还没有实现这个功能，但登录成功会显示这个界面
      </Typography>

      <Typography variant="body2" align="center" >

        
         <Link href="/login" style={{color : "blue"}}> Back to Login</Link>
         
      </Typography>

      <Typography variant="body2" align="center" >

        
         <Link href="/signup" style={{color : "blue"}}>Back to signup</Link>
         
      </Typography>
    </Box>
  );
}