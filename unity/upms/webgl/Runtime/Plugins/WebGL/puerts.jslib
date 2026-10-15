var exportDLL = {
    // Force Emscripten to link these library/runtime functions into the final
    // framework.js. Since Emscripten >= 3.1 they live in system libraries
    // (libstrings.js/libcore.js/libaddfunction.js) and are only emitted when
    // something depends on them - e.g. $UTF16ToString is otherwise only pulled
    // in by embind, so it is missing from Unity 7000 (Emscripten 4.x) builds.
    InitPuertsWebGL__deps: [
        '$UTF8ToString', '$UTF16ToString',
        '$stringToUTF8', '$lengthBytesUTF8', '$stringToUTF16', '$lengthBytesUTF16',
        '$stackAlloc', '$stackSave', '$stackRestore',
        '$addFunction', '$removeFunction', '$getWasmTableEntry',
        'malloc', 'free',
        'setTempRet0',
    ],
    InitPuertsWebGL: function () {
        var global = typeof global != 'undefined' ? global : window;
        if (!global.PuertsWebGL) {
            throw new Error('cannot found PuertsWebGL script. please find some way to load puerts-runtime.js');
        }
        // refresh the heap views cached by PuerTS after the wasm heap grows.
        // Emscripten >= 3.1 renamed updateGlobarBufferAndViews (typo) to updateMemoryViews;
        // Unity 7000 (Emscripten 4.x) only ships updateMemoryViews.
        var syncHeapViewsToPuerts = function () {
            global.PuertsWebGL.updateGlobalBufferAndViews(
                HEAP8,
                HEAPU8,
                HEAP32,
                HEAPF32,
                HEAPF64
            );
        };
        if (typeof updateMemoryViews == 'function') {
            var oldUpdateMemoryViews = updateMemoryViews;
            updateMemoryViews = function () {
                oldUpdateMemoryViews();
                syncHeapViewsToPuerts();
            };
        } else if (typeof updateGlobarBufferAndViews == 'function') {
            // legacy Emscripten 2.x/3.1 (Unity 2021/2022)
            var oldUpdateGlobarBufferAndViews = updateGlobarBufferAndViews;
            updateGlobarBufferAndViews = function (buf) {
                oldUpdateGlobarBufferAndViews(buf);
                syncHeapViewsToPuerts();
            };
        } else if (typeof updateGlobalBufferAndViews == 'function') {
            // engine forks that fixed the typo in place (e.g. Tuanjie)
            var oldUpdateGlobalBufferAndViews = updateGlobalBufferAndViews;
            updateGlobalBufferAndViews = function (buf) {
                oldUpdateGlobalBufferAndViews(buf);
                syncHeapViewsToPuerts();
            };
        } else {
            // last resort: watch the underlying WebAssembly.Memory for growth
            // (covers GROWABLE_ARRAYBUFFERS builds where updateMemoryViews is
            // not called on grow, if the memory object exposes a 'grow' event)
            var memory = (typeof wasmMemory != 'undefined') ? wasmMemory
                : (Module && Module.wasmMemory) ? Module.wasmMemory : null;
            if (memory && typeof memory.addEventListener == 'function') {
                memory.addEventListener('grow', syncHeapViewsToPuerts);
            }
        }

        // defensive: typeof-guards so a missing symbol degrades with a clear
        // warning instead of a ReferenceError that kills the whole PuerTS init
        // (__deps above should keep them all present). typeof + direct reference
        // keeps closure-compiler renaming consistent - never use eval/strings here.
        var warnMissingRuntimeFn = function (name) {
            if (typeof console != 'undefined' && console.warn) {
                console.warn('[PuerTS] Emscripten runtime function "' + name + '" is missing in this build; the related feature will fail when used.');
            }
            return undefined;
        };

        global.PuertsWebGL.Init({
            UTF8ToString: (typeof UTF8ToString != 'undefined') ? UTF8ToString : warnMissingRuntimeFn('UTF8ToString'),
            UTF16ToString: (typeof UTF16ToString != 'undefined') ? UTF16ToString : warnMissingRuntimeFn('UTF16ToString'),
            _malloc: (typeof _malloc != 'undefined') ? _malloc : warnMissingRuntimeFn('_malloc'),
            _free: (typeof _free != 'undefined') ? _free : warnMissingRuntimeFn('_free'),
            _setTempRet0: (typeof _setTempRet0 != 'undefined') ? _setTempRet0 : warnMissingRuntimeFn('_setTempRet0'),
            stringToUTF8: (typeof stringToUTF8 != 'undefined') ? stringToUTF8 : warnMissingRuntimeFn('stringToUTF8'),
            lengthBytesUTF8: (typeof lengthBytesUTF8 != 'undefined') ? lengthBytesUTF8 : warnMissingRuntimeFn('lengthBytesUTF8'),
            stringToUTF16: (typeof stringToUTF16 != 'undefined') ? stringToUTF16 : warnMissingRuntimeFn('stringToUTF16'),
            lengthBytesUTF16: (typeof lengthBytesUTF16 != 'undefined') ? lengthBytesUTF16 : warnMissingRuntimeFn('lengthBytesUTF16'),
            stackAlloc: (typeof stackAlloc != 'undefined') ? stackAlloc : warnMissingRuntimeFn('stackAlloc'),
            stackSave: (typeof stackSave != 'undefined') ? stackSave : warnMissingRuntimeFn('stackSave'),
            stackRestore: (typeof stackRestore != 'undefined') ? stackRestore : warnMissingRuntimeFn('stackRestore'),
            getWasmTableEntry: (typeof getWasmTableEntry != 'undefined') ? getWasmTableEntry : function(funcPtr) {
                return wasmTable.get(funcPtr);
            },
            addFunction: (typeof addFunction != 'undefined') ? addFunction : warnMissingRuntimeFn('addFunction'),
            removeFunction: (typeof removeFunction != 'undefined') ? removeFunction : warnMissingRuntimeFn('removeFunction'),
            _CallCSharpFunctionCallback: Module._CallCSharpFunctionCallback,
            _CallCSharpConstructorCallback: Module._CallCSharpConstructorCallback,
            _CallCSharpDestructorCallback: Module._CallCSharpDestructorCallback,
            InjectPapiGLNativeImpl: Module._InjectPapiGLNativeImpl,
            PApiCallbackWithScope: Module._PApiCallbackWithScope,
            PApiConstructorWithScope: Module._PApiConstructorWithScope,
            
            find_class_by_id: Module._find_class_by_id,
            load_class_by_id: Module._load_class_by_id,
            get_class_name: Module._get_class_name,
            get_class_initialize: Module._get_class_initialize,
            get_class_finalize: Module._get_class_finalize,
            get_class_type_id: Module._get_class_type_id,
            get_class_super_type_id: Module._get_class_super_type_id,
            get_class_methods: Module._get_class_methods,
            get_class_functions: Module._get_class_functions,
            get_class_properties: Module._get_class_properties,
            get_class_variables: Module._get_class_variables,
            get_next_property_info: Module._get_next_property_info,
            get_next_function_info: Module._get_next_function_info,
            get_property_info_name: Module._get_property_info_name,
            get_property_info_getter: Module._get_property_info_getter,
            get_property_info_setter: Module._get_property_info_setter,
            get_function_info_name: Module._get_function_info_name,
            get_function_info_callback: Module._get_function_info_callback,
            get_class_data: Module._get_class_data,
            get_class_on_enter: Module._get_class_on_enter,
            get_class_on_exit: Module._get_class_on_exit,
            get_property_info_getter_data: Module._get_property_info_getter_data,
            get_property_info_setter_data: Module._get_property_info_setter_data,
            get_function_info_data: Module._get_function_info_data,
            
            HEAP8,
            HEAPU8,
            HEAP32,
            HEAPF32,
            HEAPF64,
        });
        global.PuertsWebGL.inited = true;
    },
};


[
    "GetLibVersion",
    "GetApiLevel",
    "GetLibBackend",
    "CreateJSEngine",
    "CreateJSEngineWithExternalEnv",
    "DestroyJSEngine",
    "SetGlobalFunction",
    "GetLastExceptionInfo",
    "LowMemoryNotification",
    "IdleNotificationDeadline",
    "RequestMinorGarbageCollectionForTesting",
    "RequestFullGarbageCollectionForTesting",
    "SetGeneralDestructor",
    "Eval",
    "ClearModuleCache",
    "GetModuleExecutor",
    "GetJSObjectValueGetter",
    "GetJSStackTrace",
    "_RegisterClass",
    "RegisterStruct",
    "RegisterFunction",
    "RegisterProperty",
    "ReturnClass",
    "ReturnObject",
    "ReturnNumber",
    "ReturnString",
    "ReturnBigInt",
    "ReturnBoolean",
    "ReturnDate",
    "ReturnNull",
    "ReturnFunction",
    "ReturnJSObject",
    "ReturnArrayBuffer",
    "ReturnCSharpFunctionCallback",
    "ReturnCSharpFunctionCallback2",
    // "GetArgumentType",
//    "GetArgumentValue",
    // "GetJsValueType",
    "GetTypeIdFromValue",
    // "GetNumberFromValue",
    // "GetDateFromValue",
    // "GetStringFromValue",
    // "GetBooleanFromValue",
    // "ValueIsBigInt",
    // "GetBigIntFromValue",
    // "GetObjectFromValue",
    // "GetFunctionFromValue",
    // "GetJSObjectFromValue",
    // "GetArrayBufferFromValue",
    "SetNumberToOutValue",
    "SetDateToOutValue",
    "SetStringToOutValue",
    "SetBooleanToOutValue",
    "SetBigIntToOutValue",
    "SetObjectToOutValue",
    "SetNullToOutValue",
    "SetArrayBufferToOutValue",
    "ThrowException",
    "PushNullForJSFunction",
    "PushDateForJSFunction",
    "PushBooleanForJSFunction",
    "PushBigIntForJSFunction",
    "PushStringForJSFunction",
    "__PushStringForJSFunction",
    "PushNumberForJSFunction",
    "PushObjectForJSFunction",
    "PushJSFunctionForJSFunction",
    "PushJSObjectForJSFunction",
    "PushArrayBufferForJSFunction",
    "SetPushJSFunctionArgumentsCallback",
    "InvokeJSFunction",
    "GetFunctionLastExceptionInfo",
    "ReleaseJSFunction",
    "ReleaseJSObject",
    "GetResultType",
    "GetNumberFromResult",
    "GetDateFromResult",
    "GetStringFromResult",
    "GetBooleanFromResult",
    "ResultIsBigInt",
    "GetBigIntFromResult",
    "GetObjectFromResult",
    "GetTypeIdFromResult",
    "GetFunctionFromResult",
    "GetJSObjectFromResult",
    "GetArrayBufferFromResult",
    "ResetResult",
    "CreateInspector",
    "DestroyInspector",
    "InspectorTick",
    "LogicTick",
    "SetLogCallback",
    "TerminateExecution",
    "GetWebGLPapiVersion",
    "GetWebGLFFIApi",
    "CreateWebGLPapiEnvRef",
    "TranToString",
    //"GetQjsFFIApi", // declare for compile
    //"GetQjsPapiEnvRef", // declare for compile
    //"GetRegsterApi",
    //"pesapi_alloc_property_descriptors",
    //"pesapi_define_class",
    //"pesapi_get_class_data",
    //"pesapi_on_class_not_found",
    //"pesapi_set_method_info",
    //"pesapi_set_property_info",
    //"pesapi_trace_native_object_lifecycle",
    "pesapi_create_array_js",
    "pesapi_create_object_js",
    "pesapi_create_function_js",
    "pesapi_create_class_js",
    "pesapi_get_array_length_js",
    "pesapi_native_object_to_value_js",
    "pesapi_throw_by_string_js",
    "pesapi_open_scope_placement_js",
    "pesapi_has_caught_js",
    "pesapi_get_exception_as_string_js",
    "pesapi_close_scope_placement_js",
    "pesapi_create_value_ref_js",
    "pesapi_release_value_ref_js",
    "pesapi_get_value_from_ref_js",
    "pesapi_get_property_js",
    "pesapi_set_property_js",
    "pesapi_get_private_js",
    "pesapi_set_private_js",
    "pesapi_get_property_uint32_js",
    "pesapi_set_property_uint32_js",
    "pesapi_call_function_js",
    "pesapi_eval_js",
    "pesapi_global_js",
    "pesapi_set_env_private_js",
    "pesapi_trace_native_object_lifecycle_js",
    "pesapi_set_registry_js"
].forEach(function (methodName) {

    exportDLL[methodName] = new Function(
        "var global = typeof global != 'undefined' ? global : window; " +
        "if (!global.PuertsWebGL) throw new Error('cannot found PuertsWebGL script. please find some way to load puerts-runtime.js');" +
        "if (!global.PuertsWebGL.inited) throw new Error('please use Puerts.WebGL.MainEnv.Get() to create JsEnv'); " +
        "if (global.PuertsWebGL.debug) console.log('WebGL DLL:" + methodName + "'); "+
        "return global.PuertsWebGL['" + methodName + "'].apply(this, arguments)"
    );
})

mergeInto(LibraryManager.library, exportDLL);