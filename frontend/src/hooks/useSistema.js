import {useContext} from "react";

import {SistemaContext} from "../context/SistemaContext";

export default function useSistema(){

return useContext(SistemaContext);

}