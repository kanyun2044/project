"use client"
import * as React from 'react';
import { Box, Button, TextField, Typography,Alert,Stack, CircularProgress, Backdrop } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';




export default function ColorTextFields() {
//作为输入框进行输入

    


    const[Email,setEmail] = React.useState("");
    const[Password,setPassword] = React.useState("");
    const[Password2,setPassword2] = React.useState("");
    const[Message,setMessage] = React.useState("");
    const [Username, setUsername] = React.useState("");
    const [PhoneNumber, setPhoneNumber] = React.useState("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();



    const [open, setOpen] = React.useState(false);
    const handleClickOpen = () => {
      setOpen(true);
    };
    const handleClose = () => {
      setOpen(false);
    };

    
    async function dealsignup() {
      if (Email === "") {
        setMessage("Email can't be empty.");
        return;
      }

      if (!emailRegex.test(Email)) {
        setMessage("Invalid email format");
        return;
      }

      if (Username === "") {
        setMessage("Username can't be empty");
        return;
      }

      if (PhoneNumber === "") {
        setMessage("Phone number can't be empty");
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

      if (Password2 === "") {
        setMessage("Please confirm your password");
        return;
      }

      if (Password !== Password2) {
        setMessage("Passwords do not match");
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
        },
          body: JSON.stringify({
            email: Email,
            username: Username,
            phoneNumber: PhoneNumber,
            password: Password,
            confirmPassword: Password2,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;

      setMessage(errorMessage || "Registration failed");
      return;
    }

    setMessage("Registration successful");
    handleClickOpen();
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

    <Typography variant="body2" color="warning" align="center" >
      {Message}
    </Typography>

    

    <TextField
      label="Username"
      value={Username}
      color="primary"
      focused
      onChange={(e) => setUsername(e.target.value)}
    />

    <TextField
      label="Phone Number"
      value={PhoneNumber}
      color="primary"
      focused
      onChange={(e) => setPhoneNumber(e.target.value)}
    />

    <TextField label="Email" value={Email} color="secondary" focused 
      onChange={(e) => setEmail(e.target.value)}
    />

    <TextField label="Password" type="password" value={Password} 
      color="success" focused 
      onChange={(e) => setPassword(e.target.value)}
    />
     
      <TextField
        label="Confirm Your Password"
        color="warning"
        type="password" value={Password2}
        focused
        onChange={(e) => setPassword2(e.target.value)}

      />
       
      <Typography variant="body1">
        Please confirm your information before registering.
      </Typography>


      <Button variant="contained" color="success" onClick={dealsignup}>
        Confirm  
      </Button>

         
      <Typography variant="body1">
        Already have an account. {""}
        <Link href="/login" style={{color:"red" }}>Login</Link>
      </Typography>

      <Typography variant="body2" align="center" >     
        <Link href="/uncompleted" style={{color : "blue"}}> Forget the Password?</Link>
      </Typography>


    
      <React.Fragment>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
      >

      <DialogTitle id="alert-dialog-title">
        {"Successful!"}
        </DialogTitle>
        <DialogContent>
        <DialogContentText id="alert-dialog-description">
            Registration successful!
            Go to the login page now?
        </DialogContentText>
        </DialogContent>
        <DialogActions>
        <Button onClick={handleClose}>Disagree</Button>
        <Button onClick={handleClose} autoFocus>
        <Link href="/login">Agree</Link>
        </Button>
        </DialogActions>
        </Dialog>
    </React.Fragment>
     
    </Box>
  );
}  

  


  



