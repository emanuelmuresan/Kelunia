Kelunia Licensing
=================

Licenta este pe locatie. Interfata nu trebuie sa afiseze functii care nu sunt incluse in planul locatiei active.

Planuri
-------

- Trial: aceleasi functii ca Standard, pentru perioada de proba.
- Standard: calendar, programari, sali, grupuri, notificari, programari recurente, istoric.
- Pro: tot din Standard plus assets, planuri/floorplans si analytics basic.
- Business: tot din Pro plus dashboard multi-locatie, permisiuni avansate, invoicing si AI scheduling.

Regula de implementare
----------------------

Orice functie vizibila in aplicatie trebuie verificata prin `hasPlanFeature(access, feature)` din `lib/licensing.ts`.

Nu se verifica planurile direct in componente, ca sa nu apara accidental functii Pro la Standard sau functii Business la Pro.
