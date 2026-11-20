export function jsonPlugin(schema, hidden = []) {
  schema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      for (const h of hidden) delete ret[h];
      return ret;
    },
  });
}
