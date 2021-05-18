import ivuFormCreate from './core/index';

const FormCreate = ivuFormCreate();

if (typeof window !== 'undefined') {
    window.formCreate = FormCreate;
    if (window.Vue) {
        FormCreate.install(window.Vue);
    }
}

const maker = FormCreate.maker;

export {maker}

export default FormCreate;
