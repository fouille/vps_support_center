var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/init-db.js
var init_db_exports = {};
__export(init_db_exports, {
  default: () => init_db_default
});
module.exports = __toCommonJS(init_db_exports);
var import_neon = require("@netlify/neon");
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_uuid = require("uuid");
var sql = (0, import_neon.neon)();
var headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};
var init_db_default = async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers
    });
  }
  try {
    const existingAdmin = await sql`
      SELECT email FROM agents WHERE email = 'admin@voipservices.fr'
    `;
    if (existingAdmin.length === 0) {
      const adminId = (0, import_uuid.v4)();
      const hashedPassword = await import_bcryptjs.default.hash("admin1234!", 10);
      await sql`
        INSERT INTO agents (id, email, password, nom, prenom, societe)
        VALUES (${adminId}, 'admin@voipservices.fr', ${hashedPassword}, 'ADMIN', 'Franck', 'VoIP Services')
      `;
      return new Response(JSON.stringify({
        message: "Utilisateur admin cr\xE9\xE9 avec succ\xE8s",
        email: "admin@voipservices.fr",
        password: "admin1234!",
        nom: "Franck ADMIN"
      }), {
        status: 200,
        headers
      });
    } else {
      return new Response(JSON.stringify({
        message: "Utilisateur admin existe d\xE9j\xE0",
        email: "admin@voipservices.fr",
        nom: "Franck ADMIN"
      }), {
        status: 200,
        headers
      });
    }
  } catch (error) {
    console.error("Init DB error:", error);
    return new Response(JSON.stringify({ detail: "Erreur lors de l'initialisation" }), {
      status: 500,
      headers
    });
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvaW5pdC1kYi5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgbmVvbiB9IGZyb20gJ0BuZXRsaWZ5L25lb24nO1xuaW1wb3J0IGJjcnlwdCBmcm9tICdiY3J5cHRqcyc7XG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcblxuY29uc3Qgc3FsID0gbmVvbigpO1xuXG5jb25zdCBoZWFkZXJzID0ge1xuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nLFxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIFBPU1QsIFBVVCwgREVMRVRFLCBPUFRJT05TJyxcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwgeyBzdGF0dXM6IDIwMCwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pLCB7XG4gICAgICBzdGF0dXM6IDQwNSxcbiAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIENoZWNrIGlmIGFkbWluIHVzZXIgYWxyZWFkeSBleGlzdHNcbiAgICBjb25zdCBleGlzdGluZ0FkbWluID0gYXdhaXQgc3FsYFxuICAgICAgU0VMRUNUIGVtYWlsIEZST00gYWdlbnRzIFdIRVJFIGVtYWlsID0gJ2FkbWluQHZvaXBzZXJ2aWNlcy5mcidcbiAgICBgO1xuXG4gICAgaWYgKGV4aXN0aW5nQWRtaW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBDcmVhdGUgZGVmYXVsdCBhZG1pbiB1c2VyOiBGcmFuY2sgQURNSU5cbiAgICAgIGNvbnN0IGFkbWluSWQgPSB1dWlkdjQoKTtcbiAgICAgIGNvbnN0IGhhc2hlZFBhc3N3b3JkID0gYXdhaXQgYmNyeXB0Lmhhc2goJ2FkbWluMTIzNCEnLCAxMCk7XG4gICAgICBcbiAgICAgIGF3YWl0IHNxbGBcbiAgICAgICAgSU5TRVJUIElOVE8gYWdlbnRzIChpZCwgZW1haWwsIHBhc3N3b3JkLCBub20sIHByZW5vbSwgc29jaWV0ZSlcbiAgICAgICAgVkFMVUVTICgke2FkbWluSWR9LCAnYWRtaW5Adm9pcHNlcnZpY2VzLmZyJywgJHtoYXNoZWRQYXNzd29yZH0sICdBRE1JTicsICdGcmFuY2snLCAnVm9JUCBTZXJ2aWNlcycpXG4gICAgICBgO1xuXG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIG1lc3NhZ2U6ICdVdGlsaXNhdGV1ciBhZG1pbiBjclx1MDBFOVx1MDBFOSBhdmVjIHN1Y2NcdTAwRThzJyxcbiAgICAgICAgZW1haWw6ICdhZG1pbkB2b2lwc2VydmljZXMuZnInLFxuICAgICAgICBwYXNzd29yZDogJ2FkbWluMTIzNCEnLFxuICAgICAgICBub206ICdGcmFuY2sgQURNSU4nXG4gICAgICB9KSwge1xuICAgICAgICBzdGF0dXM6IDIwMCxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIG1lc3NhZ2U6ICdVdGlsaXNhdGV1ciBhZG1pbiBleGlzdGUgZFx1MDBFOWpcdTAwRTAnLFxuICAgICAgICBlbWFpbDogJ2FkbWluQHZvaXBzZXJ2aWNlcy5mcicsXG4gICAgICAgIG5vbTogJ0ZyYW5jayBBRE1JTidcbiAgICAgIH0pLCB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0luaXQgREIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBkZXRhaWw6ICdFcnJldXIgbG9ycyBkZSBsXFwnaW5pdGlhbGlzYXRpb24nIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG4gIH1cbn07Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsa0JBQXFCO0FBQ3JCLHNCQUFtQjtBQUNuQixrQkFBNkI7QUFFN0IsSUFBTSxVQUFNLGtCQUFLO0FBRWpCLElBQU0sVUFBVTtBQUFBLEVBQ2QsK0JBQStCO0FBQUEsRUFDL0IsZ0NBQWdDO0FBQUEsRUFDaEMsZ0NBQWdDO0FBQUEsRUFDaEMsZ0JBQWdCO0FBQ2xCO0FBRUEsSUFBTyxrQkFBUSxPQUFPLEtBQUssWUFBWTtBQUNyQyxNQUFJLElBQUksV0FBVyxXQUFXO0FBQzVCLFdBQU8sSUFBSSxTQUFTLE1BQU0sRUFBRSxRQUFRLEtBQUssUUFBUSxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxNQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLFdBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLE9BQU8scUJBQXFCLENBQUMsR0FBRztBQUFBLE1BQ25FLFFBQVE7QUFBQSxNQUNSO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUVBLE1BQUk7QUFFRixVQUFNLGdCQUFnQixNQUFNO0FBQUE7QUFBQTtBQUk1QixRQUFJLGNBQWMsV0FBVyxHQUFHO0FBRTlCLFlBQU0sY0FBVSxZQUFBQSxJQUFPO0FBQ3ZCLFlBQU0saUJBQWlCLE1BQU0sZ0JBQUFDLFFBQU8sS0FBSyxjQUFjLEVBQUU7QUFFekQsWUFBTTtBQUFBO0FBQUEsa0JBRU0sT0FBTyw4QkFBOEIsY0FBYztBQUFBO0FBRy9ELGFBQU8sSUFBSSxTQUFTLEtBQUssVUFBVTtBQUFBLFFBQ2pDLFNBQVM7QUFBQSxRQUNULE9BQU87QUFBQSxRQUNQLFVBQVU7QUFBQSxRQUNWLEtBQUs7QUFBQSxNQUNQLENBQUMsR0FBRztBQUFBLFFBQ0YsUUFBUTtBQUFBLFFBQ1I7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNILE9BQU87QUFDTCxhQUFPLElBQUksU0FBUyxLQUFLLFVBQVU7QUFBQSxRQUNqQyxTQUFTO0FBQUEsUUFDVCxPQUFPO0FBQUEsUUFDUCxLQUFLO0FBQUEsTUFDUCxDQUFDLEdBQUc7QUFBQSxRQUNGLFFBQVE7QUFBQSxRQUNSO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0YsU0FBUyxPQUFPO0FBQ2QsWUFBUSxNQUFNLGtCQUFrQixLQUFLO0FBQ3JDLFdBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLFFBQVEsa0NBQW1DLENBQUMsR0FBRztBQUFBLE1BQ2xGLFFBQVE7QUFBQSxNQUNSO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGOyIsCiAgIm5hbWVzIjogWyJ1dWlkdjQiLCAiYmNyeXB0Il0KfQo=
