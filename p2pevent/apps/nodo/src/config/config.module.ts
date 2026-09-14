import { Global, Module } from '@nestjs/common';
import { NodeConfigService } from './node-config.service';

/**
 * @Global hace que NodeConfigService se pueda inyectar en cualquier
 * módulo sin tener que importar este módulo en cada uno.
 * esta clase es le brinda el permiso a node-config.service de que pueda ser inyectado en cualquier clase
 * 
 * El Servicio es el bloque (el contenido) y el Módulo es la caja/empaque que lo 
 * distribuye y declara sus reglas de visibilidad (el contenedor).
 * 
1. ¿Por qué NestJS no permite registrar el Service directamente sin un Module?
En otros entornos o scripts (como Node.js puro), cuando exportas una clase o función, simplemente la importas donde 
la necesitas y listo. Pero NestJS funciona con un contenedor de Inyección de Dependencias (DI).

@Injectable() no crea la instancia. Solo le dice al compilador: "Esta clase es candidata a ser gestionada por NestJS".

El @Module es el que le dice al motor de NestJS: "Oye, crea una instancia única (singleton) de NodeConfigService en 
memoria y adminístrala dentro de mi contenedor".

Si pones @Injectable() a una clase pero no la incluyes en la lista de providers de algún módulo, la clase es completamente 
"invisible" para el sistema de NestJS.
 */

@Global()
@Module({
  providers: [NodeConfigService],
  exports: [NodeConfigService],
})
export class NodeConfigModule {}