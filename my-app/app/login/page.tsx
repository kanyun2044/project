"use client"
import * as React from 'react';
import { Box, Button, TextField, Typography,Alert,Stack, CircularProgress, Backdrop,Snackbar} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";



export default function ColorTextFields() {



    const[Email,setEmail] = React.useState("");
    const[Password,setPassword] = React.useState("");
    const[Message,setMessage] = React.useState("");
    const [openSnackbar, setOpenSnackbar] = React.useState(false);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();

    async function deallogin() {
      if (Email === "") {
        setMessage("Email can't be empty.");
        return;
      }

      if (!emailRegex.test(Email)) {
        setMessage("Invalid email format");
        return;
      }

      if (Password === "") {
        setMessage("Password can't be empty");
        return;
      }

      if (Password.length < 6) {
        setMessage("Password must contain at least 6 characters");
        return;
      }

      try {
        const response = await fetch(
         `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
          {
            method: "POST",
            credentials: "include",
            headers: {
            "Content-Type": "application/json",
          },
            body: JSON.stringify({
            email: Email,
            password: Password,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;

      setMessage(errorMessage || "Login failed");
      return;
    }

    

    setMessage("");
    setOpenSnackbar(true);

    setTimeout(() => {
    router.push("/homeTest");
    }, 2000);
  } catch {
    setMessage("Unable to connect to the server");
  }
}

  
   

    return (

      
    
        <Box
            component="form"
            sx={{ width: 400,
            mx: "auto",
            mt: 20,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            }}

            noValidate
            autoComplete="off"
        >
          <Snackbar
            open={openSnackbar}
            autoHideDuration={2000}
            onClose={() => setOpenSnackbar(false)}
            anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          >
          <Alert
              severity="success"
              variant="filled"
             onClose={() => setOpenSnackbar(false)}
          >
          Login successful
          </Alert>
        </Snackbar>

        <Typography variant="body2" color="warning" align="center" >
        {Message}
        </Typography>


        <TextField label="Email" value={Email} color="secondary" focused 
        onChange={(e) => setEmail(e.target.value)}
        />


        <TextField label="Password" type="password" value={Password} 
        color="success" focused 
        onChange={(e) => setPassword(e.target.value)}
        />

        


        <Button variant="contained" color="success" onClick={deallogin}>
            Confirm
        </Button>

        <Typography variant="body2" align="center" >
              {"Don't have an account?"}
        <Link href="/signup" style={{color : "red"}}> Sign up</Link>
         </Typography>

        <Typography variant="body2" align="center" >
         <Link href="/uncompleted" style={{color : "blue"}}> Forget the Password?</Link>
        </Typography>

        </Box>
    );
}  





