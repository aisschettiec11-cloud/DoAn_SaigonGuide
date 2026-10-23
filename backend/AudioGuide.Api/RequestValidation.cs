using AudioGuide.Business;
using AudioGuide.Data;
using System.ComponentModel.DataAnnotations;
public class RequestValidation : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        foreach (var arg in ctx.Arguments)
        {
            if (arg is Location or Language or LocationTranslation or Feedback or PlayLog)
            {
                var errors = new List<ValidationResult>();
                if (!Validator.TryValidateObject(arg, new ValidationContext(arg), errors, true)) throw new AppError(400, string.Join("; ", errors.Select(e => e.ErrorMessage)));
            }
        }
        return await next(ctx);
    }
}
