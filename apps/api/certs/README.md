# CA pública de Supabase

`supabase-ca.crt` procede del enlace «Download certificate» del Dashboard de Supabase:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Es una autoridad de certificación pública, no contiene claves privadas. En modo
`APP_MODE=supabase`, el cliente PostgreSQL la utiliza con `sslmode=verify-full` para
verificar tanto la cadena de confianza como el nombre del servidor. Vence el 26 de
abril de 2031; actualizar desde el Dashboard si Supabase cambia la CA.
