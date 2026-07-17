"use client"
import * as React from 'react';
import { Box, Button, TextField, Typography,Alert,Stack, CircularProgress, Backdrop } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";



export default function ColorTextFields() {

    const testemail="123456@qq.com";
    const testpassword ="123456";

    const[Email,setEmail] = React.useState("");
    const[Password,setPassword] = React.useState("");
    const[Message,setMessage] = React.useState("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();

    function deallogin (){
        if(Email =="")
        setMessage("Email can't be empty.")

        else if (!emailRegex.test(Email))
        setMessage("Invalid email format")

        else if(Password =="")
        setMessage("Password can't be empty")

        

        else if (Email!=testemail)
        setMessage("User email does not exist")

        else if (Password!=testpassword)
        setMessage("Password is not correct")

        else{
        setMessage("Login successful")
        router.push("/homeTest");
        }
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

        


        <Button variant="contained" color="success" onClick={deallogin}>
            Confirm
        </Button>

        <Typography variant="body2" align="center" >
            Don't have an account?{""}
        <Link href="/signup" style={{color : "red"}}> Sign up</Link>
         </Typography>

        <Typography variant="body2" align="center" >
         <Link href="/uncompleted" style={{color : "blue"}}> Forget the Password?</Link>
        </Typography>

        </Box>
    );
}  





