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

    const testemail="123456@qq.com";


    const[Email,setEmail] = React.useState("");
    const[Password,setPassword] = React.useState("");
    const[Password2,setPassword2] = React.useState("");
    const[Message,setMessage] = React.useState("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();


    const [open, setOpen] = React.useState(false);
    const handleClickOpen = () => {
      setOpen(true);
    };
    const handleClose = () => {
      setOpen(false);
    };

    
    function dealsignup (){

        if(Email =="")
        setMessage("Email can't be empty.")

        else if (!emailRegex.test(Email))
        setMessage("Invalid email format")

        else if(Password =="") 
        setMessage("Password can't be empty")
      
        else if(Password2=="")
        setMessage("Please confirm your password")

        else if(Password!=Password2)
        setMessage("Passwords do not match ")

        else if (testemail == Email)
        setMessage("Email already exist")

        else{
        setMessage("Registration successful")
        handleClickOpen()}
        
    };



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
        <Link href=" /login" style={{color:"red" }}>Login</Link>      
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

  


  



