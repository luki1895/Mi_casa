UPDATE usuario
SET password = CASE usuario
    WHEN 'luis' THEN '$2b$10$NNfLK9c.141etsXsH.PtZOX9jIU/PBiVh7IH5TAHx3q1MUFbr6mOS'
    WHEN 'maria' THEN '$2b$10$wubARzKlAa9QUm3L8NbNg.IjoOT4/2kp5mEc4YugJCEoLUX4Y18sa'
    WHEN 'mesero' THEN '$2b$10$vgJfQZ6NPIthN0JyIclnEe5hLSLwl6bpawfIVpkXoBQ0Pnk08oJKG'
    WHEN 'caja' THEN '$2b$10$L8Ambnf4xexMrFPm0SxzvO71I8YWWX11/rCeF5bYS2KFVn2cMI5b2'
    WHEN 'cliente' THEN '$2b$10$Kjxnlr5EpaMs22KPcx109.iJ5kNzBAH8ztkRaScAL0la51ARohlFO'
END,
estado = TRUE
WHERE (usuario = 'luis' AND password = '$2b$10$ifW8ScebSReStsahF039X.EhtfTVo06rEH.fhYshybFGt.IhMURh6')
   OR (usuario = 'maria' AND password = '$2b$10$FGohPwvAqgfOliZniActWOyECdfbOulja.z2cgMYilGGRZl6e5l1u')
   OR (usuario = 'mesero' AND password = '$2b$10$mXqnvKAQKpa.SoR5skneY.vn6wvDnGhVsbYHUwLzqsC8TG7CPFNPm')
   OR (usuario = 'caja' AND password = '$2b$10$P8EqJiMcXWYHWvSgmAqrkuVLK9CNR2KvGJ6gbH/v6w6m1IE2mCbhO')
   OR (usuario = 'cliente' AND password = '$2b$10$wnxyoUX7aE7mvctAFJ0aOOUClu1idZXJ7ueV37NQTuxnV2Wc7Bl3C');
