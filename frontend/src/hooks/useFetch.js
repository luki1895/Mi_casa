import {useState,useEffect} from "react";

export default function useFetch(service){

const[data,setData]=useState([]);

const[loading,setLoading]=useState(true);

const[error,setError]=useState(null);

const cargar=async()=>{

try{

setLoading(true);

const respuesta=await service();

setData(respuesta.data);

}

catch(err){

setError(err);

}

finally{

setLoading(false);

}

};

useEffect(()=>{

cargar();

},[]);

return{

data,

loading,

error,

recargar:cargar

};

}