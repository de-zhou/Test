## Real-World Free-Operant (RWFO) app (V2.0) app code (frontend code).

### General:
- The app was first published (and comprehensively described) by Gera et al. [See the paper](https://doi.org/10.3758/s13428-023-02263-6).
- [See a demo of the app](https://ranigera.github.io/RWFO_app_demo/).
- In this new version of the app (V2.0) we have incorporated multiple new functionalities to make the app relevant to a wide scope of research questions. The main new functionalities are described in the paper and in the [online configuration webpage](https://ranigera.github.io/RWFO_app_setup/).

### Notes:
* The app is designed as a progressive web application (PWA) and is compatible with both iPhones and Andorid-based smartphones.
* This means participants don't need to go through application stores to install it.
* It also means you can use more than one instance of the app (e.g., to have multiple contexts with different conditions).
* It is designed to be connected with a mongoDB database and use a websocket for fast communication.

### To use it: 
* Download this folder.
* Create or use the existing configuration 'settings.js' file (located in the main folder). For a web page designed to easily edit the main setup file (named `settings.js`) click [here](https://ranigera.github.io/RWFO_app_setup/).
* Look for the placeholder ROOT_DOMAIN in settings.js and replace it with the root domain you intend to use.
* Run create_subject_keycodes_and_manifests.py to create subject ID codes, links and related files.
* The app needs to be connected with a backend code and a mogoDB database (or you can adjust it to use any other preferred alternative).


### If you have any questions, interested in other functionalities or wish to collaborate, please [contact us](mailto:ranigera.aristo@gmail.com">).