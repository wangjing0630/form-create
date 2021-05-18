import extend from '@form-create/utils/lib/extend';
import {$set} from '@form-create/utils/lib';
import is, {hasProperty} from '@form-create/utils/lib/type';
import {invoke} from '../frame/util';
import toArray from '@form-create/utils/lib/toarray';

export default function useInput(Handler) {
    extend(Handler.prototype, {
        getValue(ctx) {
            if (!hasProperty(ctx, 'cacheValue')) {
                ctx.cacheValue = ctx.parser.toValue(this.getFormData(ctx), ctx);
            }
            return ctx.cacheValue;
        },
        setValue(ctx, value, formValue, setFlag) {
            if (ctx.deleted) return;
            ctx.cacheValue = value;
            this.changeStatus = true;
            this.nextRefresh();
            this.$render.clearCache(ctx);
            this.setFormData(ctx, formValue);
            this.syncValue();
            this.valueChange(ctx, value);
            this.vm.$emit('change', ctx.field, value, ctx.origin, this.api, setFlag);
            this.effect(ctx, 'value');
        },
        onInput(ctx, value) {
            let val;
            if (ctx.input && (this.isQuote(ctx, val = ctx.parser.toValue(value, ctx)) || this.isChange(ctx, val))) {
                this.setValue(ctx, val, value);
            }
        },
        setFormData(ctx, value) {
            $set(this.formData, ctx.field, value);
        },
        getFormData(ctx) {
            return this.formData[ctx.field];
        },
        validate() {
            toEmpty(this.vm.validate);
            Object.keys(this.fieldCtx).forEach(id => {
                const ctx = this.fieldCtx[id];
                this.vm.validate[ctx.field] = toArray(ctx.rule.validate);
            });
            return this.vm.validate;
        },
        syncForm() {
            toEmpty(this.form);
            Object.defineProperties(this.form, Object.keys(this.formData).reduce((initial, field) => {
                const ctx = this.getCtx(field);
                const handle = this.valueHandle(ctx);
                handle.configurable = true;
                initial[field] = handle;
                return initial;
            }, {}));
            this.syncValue();
        },
        valueHandle(ctx) {
            return {
                enumerable: true,
                get: () => {
                    return this.getValue(ctx);
                },
                set: (value) => {
                    if (this.isChange(ctx, value)) {
                        this.setValue(ctx, value, ctx.parser.toFormValue(value, ctx), true);
                    }
                }
            };
        },
        appendValue(rule) {
            if (!rule.field || !hasProperty(this.appendData, rule.field)) return;
            rule.value = this.appendData[rule.field];
            delete this.appendData[rule.field];
        },
        addSubForm(ctx, subForm) {
            this.subForm[ctx.field] = subForm;
        },
        deferSyncValue(fn) {
            if (!this.deferSyncFn) {
                this.deferSyncFn = fn;
            }
            invoke(fn);
            if (this.deferSyncFn === fn) {
                this.deferSyncFn = null;
                if (fn.sync) {
                    this.syncValue();
                }
            }
        },
        syncValue() {
            if (this.deferSyncFn) {
                return this.deferSyncFn.sync = true;
            }
            this.vm._updateValue({...this.form});
        },
        isChange(ctx, value) {
            return JSON.stringify(ctx.rule.value) !== JSON.stringify(value);
        },
        isQuote(ctx, value) {
            return (is.Object(value) || Array.isArray(value)) && value === ctx.rule.value;
        },
        refreshUpdate(ctx, val) {
            const fn = ctx.rule.update;
            if (is.Function(fn)) {
                const state = invoke(() => fn(val, ctx.origin, this.api));
                if (state === undefined) return;
                ctx.rule.hidden = state === true;
            }
        },
        valueChange(ctx, val) {
            this.refreshRule(ctx, val);
            this.bus.$emit('change-' + ctx.field, val);
        },
        refreshRule(ctx, val) {
            if (this.refreshControl(ctx)) {
                this.$render.clearCacheAll();
                this.loadRule();
                this.refresh();
            }
            this.refreshUpdate(ctx, val);
        },
        appendLink(ctx) {
            const link = ctx.rule.link;
            is.trueArray(link) && link.forEach(field => {
                const fn = () => this.refreshRule(ctx, ctx.rule.value);

                this.bus.$on('change-' + field, fn);
                ctx.linkOn.push(() => this.bus.$off('change-' + field, fn));
            });
        },
        fields() {
            return Object.keys(this.formData);
        },
    });
}

function toEmpty(obj) {
    Object.keys(obj).forEach(k => delete obj[k]);
}